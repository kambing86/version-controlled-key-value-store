import bodyParser from 'body-parser';
import express from 'express';
import http from 'http';
import {forIn, keys} from 'lodash';
import redis from 'redis';
import ServerShutdown from 'server-shutdown';
import {promisify} from 'util';

const redisClient = redis.createClient({
  host: 'redis',
});
const zaddAsync = promisify(redisClient.zadd).bind(redisClient);
const zrevrangebyscoreAsync = promisify(redisClient.zrevrangebyscore).bind(redisClient);

const {SET_MULTI_VALUES} = process.env;

const appendValue = async (key: string, value: string, timestamp: string): Promise<void> => {
  await zaddAsync(key, timestamp, `${timestamp},${JSON.stringify(value)}`);
};
const findValue = async (key: string, timestamp: string): Promise<any | undefined> => {
  const ary = await zrevrangebyscoreAsync(key, timestamp || '+inf', '-inf', 'LIMIT', 0, 1);
  if (ary.length === 1) {
    const matches = /^\d+,(.+)$/ig.exec(ary[0]);
    if (matches) {
      const [, matchGroup] = matches;
      return JSON.parse(matchGroup);
    }
  }
  return undefined;
};

const app = express();
const httpServer = http.createServer(app);
const serverShutdown = new ServerShutdown();

app.use(bodyParser.json());
app.get('/object/:key', async (req, res) => {
  res.json({value: await findValue(req.params.key, req.query.timestamp)});
});
app.post('/object', async (req, res) => {
  const timestamp = Date.now();
  const {body} = req;
  let count = 0;
  let returnData = {};
  const totalKeys = keys(body);
  if (totalKeys.length === 0) {
    throw new Error('no value');
  }
  if (totalKeys.length > 1 && SET_MULTI_VALUES === 'false') {
    throw new Error('cannot set multiple value');
  }
  const allPromises: any[] = [];
  forIn(body, (value, key) => {
    allPromises.push(appendValue(key, value, timestamp.toString()));
    count = count + 1;
    if (count === 1) {
      returnData = {
        key,
        value,
      };
    }
  });
  if (count > 1) {
    returnData = {
      ...body,
    };
  }
  await Promise.all(allPromises);
  res.json({...returnData, timestamp});
});
app.listen(8080, () => {
  console.log('listening');
});

let alive = true;
app.get('/health', (_req, res) => {
  if (alive) {
    res.sendStatus(200);
  } else {
    res.sendStatus(500);
  }
});
serverShutdown.registerServer(httpServer);
process.on('SIGTERM', () => {
  alive = false;
  setTimeout(() => {
    serverShutdown.shutdown(() => {
      process.exit();
    });
  }, 5000);
});
