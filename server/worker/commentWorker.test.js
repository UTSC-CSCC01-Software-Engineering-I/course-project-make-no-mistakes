describe('Comment processing load limiter', () => {
  let Comment;
  let addCommentToQueue;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    jest.doMock('../models/index.js', () => ({
      Comment: { findByPk: jest.fn() },
    }));

    Comment = require('../models/index.js').Comment;
    ({ addCommentToQueue } = require('./commentWorker.js'));
    global.io = undefined;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    delete global.io;
  });

  function makeComment(id) {
    return {
      id,
      content: 'Change this boundary',
      proposalId: 'proposal-1',
      userId: 'user-1',
      save: jest.fn().mockResolvedValue(undefined),
    };
  }

  test('waits for the active job before starting the next queued comment', async () => {
    const first = makeComment(1);
    const second = makeComment(2);
    Comment.findByPk
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);

    addCommentToQueue(1);
    addCommentToQueue(2);

    await jest.advanceTimersByTimeAsync(1499);
    expect(Comment.findByPk).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(Comment.findByPk).toHaveBeenCalledTimes(1);
    expect(Comment.findByPk).toHaveBeenLastCalledWith(1);

    await jest.advanceTimersByTimeAsync(1500);
    expect(Comment.findByPk.mock.calls.map(([id]) => id)).toEqual([1, 2]);
  });

  test('processes queued comments in order with a maximum concurrency of one', async () => {
    let activeSaves = 0;
    let maximumActiveSaves = 0;

    Comment.findByPk.mockImplementation(async (id) => ({
      ...makeComment(id),
      save: jest.fn().mockImplementation(async () => {
        activeSaves += 1;
        maximumActiveSaves = Math.max(maximumActiveSaves, activeSaves);
        await new Promise((resolve) => setTimeout(resolve, 100));
        activeSaves -= 1;
      }),
    }));

    addCommentToQueue(10);
    addCommentToQueue(11);
    addCommentToQueue(12);

    await jest.advanceTimersByTimeAsync(5000);

    expect(Comment.findByPk.mock.calls.map(([id]) => id)).toEqual([10, 11, 12]);
    expect(maximumActiveSaves).toBe(1);
  });

  test('releases the limiter and continues after a processing failure', async () => {
    const recoveredComment = makeComment(22);
    Comment.findByPk
      .mockRejectedValueOnce(new Error('Temporary database failure'))
      .mockResolvedValueOnce(recoveredComment);

    addCommentToQueue(21);
    addCommentToQueue(22);

    await jest.advanceTimersByTimeAsync(3000);

    expect(Comment.findByPk.mock.calls.map(([id]) => id)).toEqual([21, 22]);
    expect(recoveredComment.save).toHaveBeenCalledTimes(1);
  });
});
