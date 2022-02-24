nterface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
}

export function defer<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export class AsyncArray<T> {
  items: {time: number, value: T}[];
  promises: {
    time: number,
    delegatedTo: number | undefined;
    promise: Promise<T>;
    reject: (reason: any) => void;
    resolve: (value: T) => void;
  }[];
  dataHighWaterMark: number = 0;
  pointsHighWaterMark: number = 0;

  constructor() {
    this.items = [];
    this.promises = [];
  }

  async get(time: number): Promise<T> {
    if (time < this.dataHighWaterMark) {
      return this.items.filter(v => v.time < time).value;
    } else {
      if (this.promises[time] !== undefined) {
        return this.promises[time].promise;
      } else {
        this.promises[time] = { delegatedTo: undefined, ...defer<T>() };
        return this.promises[time].promise;
      }
    }
  }

  insert(time: number, value: T) {
    this.items[time] = value;
    if (this.promises[time]) {
      this.promises[time].resolve(value);
    }
  }
}

const myArray = new AsyncArray<number>();
(async () => {
  await myArray.get(5);
  console.log("DONE");
})();

setTimeout(() => {
  myArray.insert(5, 0);
}, 5000);
