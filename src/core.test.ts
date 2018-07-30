import {expect} from 'chai';
import sinon from 'sinon';
import 'sinon-chai';
import {appendValue, findValue} from './core';

describe('appendValue', () => {
  it('should call zaddAsync with correct parameter', async () => {
    const key = 'a';
    const value = {
      anthing: true,
      random: [1, 2],
    };
    const timestamp = Date.now().toString();
    const zaddAsyncStub = sinon.stub();
    await appendValue(key, value, timestamp, zaddAsyncStub);
    expect(zaddAsyncStub).to.be.calledOnceWith(key, timestamp, `${timestamp},${JSON.stringify(value)}`);
  });
});

describe('findValue', () => {
  it('should call zrevrangebyscoreAsync with correct parameter', async () => {
    const key = 'a';
    const value = {
      anthing: true,
      random: [1, 2],
    };
    const timestamp = Date.now().toString();
    const zrevrangebyscoreAsyncStub = sinon.stub();
    const returnValue = {anthing: 'random'};
    const stubValue = [`123,${JSON.stringify(returnValue)}`];
    zrevrangebyscoreAsyncStub.returns(stubValue);
    const foundValue = await findValue(key, timestamp, zrevrangebyscoreAsyncStub);
    expect(foundValue).to.deep.equal(returnValue);
    expect(zrevrangebyscoreAsyncStub).to.be.calledOnceWith(key, timestamp || '+inf', '-inf', 'LIMIT', 0, 1);
  });
});
