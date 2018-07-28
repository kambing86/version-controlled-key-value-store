import express from 'express';
import bodyParser from 'body-parser';
import {keys, findLast} from 'lodash';
import redis from 'redis';
import {promisify} from 'util';

const redisClient = redis.createClient({
  host: 'redis'
});
const getAsync = promisify(redisClient.get).bind(redisClient);
const setAsync = promisify(redisClient.set).bind(redisClient);

const {USE_REDIS, SET_MULTI_VALUES} = process.env;

const keyStore = {};
const appendValue = async(key: string, value: string, timestamp: string): Promise<void> => {
  // const data = keyStore[key];
  // keyStore[key] = {
  //   ...data,
  //   [timestamp]: value,
  // };
  const data = JSON.parse(await getAsync(key));
  await setAsync(key,  JSON.stringify({
    ...data,
    [timestamp]: value,
  }));
}
const findValue = async (key: string, timestamp: string): Promise<any | undefined> => {
  // const data = keyStore[key];
  const data = JSON.parse(await getAsync(key));
  if (data) {
    return findLast(data, (_value, timestampKey) => (timestamp === undefined || parseInt(timestamp) >= parseInt(timestampKey)));
  }
  return undefined;
}

const server = express();
server.use(bodyParser.json());
server.get('/object/:key', async (req, res) => {
  res.json({value: await findValue(req.params.key, req.query.timestamp)});
});
server.post('/object', async (req, res) => {
  const timestamp = Date.now();
  const {body} = req;
  let count = 0;
  let returnData = {};
  if (keys(body).length > 1 && SET_MULTI_VALUES === 'false') {
    throw new Error('cannot set multiple value');
  }
  for (const key in body) {
    const value = body[key];
    await appendValue(key, value, timestamp.toString());
    count++;
    if (count === 1) {
      returnData = {
        key,
        value,
      };
    }
  }
  if (count === 0) {
    throw new Error('no value');
  }
  if (count > 1) {
    returnData = {
      ...body
    };
  }
  res.json({...returnData, timestamp});
});
server.listen(8080, () => {
  console.log('listening');
});
