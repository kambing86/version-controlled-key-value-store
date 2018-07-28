import express from 'express';
import bodyParser from 'body-parser';
import {findLast} from 'lodash';

const keyStore = {};
const appendValue = (key, value, timestamp): void => {
  const data = keyStore[key];
  keyStore[key] = {
    ...data,
    [timestamp]: value,
  };
}
const findValue = (key, timestamp): any | undefined => {
  const data = keyStore[key];
  if (data) {
    return findLast(data, (_value, timestampKey) => (timestamp === undefined || timestamp >= timestampKey));
  }
  return undefined;
}

const server = express();
server.use(bodyParser.json());
server.get('/object/:key', (req, res) => {
  res.json({value: findValue(req.params.key, req.query.timestamp)});
});
server.post('/object', (req, res) => {
  const timestamp = Date.now();
  const {body} = req;
  let count = 0;
  let returnData = {};
  for (const key in body) {
    const value = body[key];
    appendValue(key, value, timestamp);
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
