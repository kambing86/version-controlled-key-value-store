export const appendValue = async (key: string, value: any, timestamp: string, zaddAsync): Promise<void> => {
  await zaddAsync(key, timestamp, `${timestamp},${JSON.stringify(value)}`);
};
export const findValue = async (key: string, timestamp: string, zrevrangebyscoreAsync): Promise<any | undefined> => {
  const ary = await zrevrangebyscoreAsync(key, timestamp || '+inf', '-inf', 'LIMIT', 0, 1);
  if (ary.length === 1) {
    const matches = /^\d+,(.+)$/gi.exec(ary[0]);
    if (matches) {
      const [, matchGroup] = matches;
      return JSON.parse(matchGroup);
    }
  }
  return undefined;
};
