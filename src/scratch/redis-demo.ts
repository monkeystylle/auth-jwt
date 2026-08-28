import { redis } from '../redis.js';

await redis.set('hello', 'world');
console.log('get hello:', await redis.get('hello'));

await redis.set('temp', 'gone-in-5s', 'EX', 5);
console.log('ttl on temp:', await redis.ttl('temp'), 'seconds');

console.log('counter:', await redis.incr('visits'));
console.log('counter:', await redis.incr('visits'));

await redis.quit();
