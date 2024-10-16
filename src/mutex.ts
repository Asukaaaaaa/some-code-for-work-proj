export class Mutex {
  private mutex = Promise.resolve();

  lock(): PromiseLike<() => void> {
    let begin: (unlock: () => void) => void = (unlock) => {};

    this.mutex = this.mutex.then(() => {
      return new Promise(begin);
    });

    return new Promise((res) => {
      begin = res;
    });
  }

  async dispatch<T>(fn: (() => T) | (() => PromiseLike<T>)): Promise<T> {
    const unlock = await this.lock();
    try {
      return await fn();
    } finally {
      unlock();
    }
  }
}

// 使用示例
const mutex = new Mutex();
const sharedResource = {
  value: 0,
};

async function incrementResource(id: number) {
  await mutex.dispatch(async () => {
    console.log(`Thread ${id} 开始访问资源`);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 模拟异步操作
    sharedResource.value++;
    console.log(`Thread ${id} 完成访问，资源值为 ${sharedResource.value}`);
  });
}

// 测试
async function runTest() {
  const promises = [1, 2, 3].map((id) => incrementResource(id));
  await Promise.all(promises);
  console.log("最终资源值:", sharedResource.value);
}

runTest();
