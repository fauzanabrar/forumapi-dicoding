const GetThreadByIdUseCase = require('../GetThreadByIdUseCase');
const ThreadRepository = require('../../../Domains/threads/ThreadRepository');
const CommentRepository = require('../../../Domains/comments/CommentRepository');
const ThreadTableTestHelper = require('../../../../tests/ThreadsTableTestHelper');
const CommentTableTestHelper = require('../../../../tests/CommentsTableTestHelper');

describe('GetThreadByIdUseCase', () => {
  it('should orchestrating the get thread action correctly', async () => {
    // Arrange
    const useCasePayload = {
      threadId: 'thread-123',
    };

    const expectedThread = {
      id: useCasePayload.threadId,
      title: 'sebuah thread',
      body: 'sebuah body thread',
      date: '2021-08-08T07:22:33.555Z',
      username: 'dicoding',
      owner: 'user-123',
    };

    const expectedComments = [
      {
        id: 'comment-123',
        content: 'sebuah comment',
        date: '2021-08-08T07:22:33.555Z',
        username: 'dicoding',
      },
      {
        id: 'comment-456',
        content: 'comment kedua',
        date: '2021-08-08T07:22:33.555Z',
        username: 'dicoding',
      },
    ];

    const mockThreadRepository = new ThreadRepository();
    const mockCommentRepository = new CommentRepository();

    // Mocking
    mockThreadRepository.verifyAvailableThread = jest.fn(() => Promise.resolve());
    mockThreadRepository.getThreadById = jest.fn(() => Promise.resolve({
      id: 'thread-123',
      title: 'sebuah thread',
      body: 'sebuah body thread',
      date: '2021-08-08T07:22:33.555Z',
      username: 'dicoding',
      owner: 'user-123',
    }));
    mockCommentRepository.getCommentsByThreadId = jest.fn(() => Promise.resolve([
      {
        id: 'comment-123',
        content: 'sebuah comment',
        date: '2021-08-08T07:22:33.555Z',
        username: 'dicoding',
        is_deleted: false,
      },
      {
        id: 'comment-456',
        content: 'comment kedua',
        date: '2021-08-08T07:22:33.555Z',
        username: 'dicoding',
        is_deleted: false,
      },
    ]));

    const getThreadByIdUseCase = new GetThreadByIdUseCase({
      threadRepository: mockThreadRepository,
      commentRepository: mockCommentRepository,
    });

    // Action
    const thread = await getThreadByIdUseCase.execute(useCasePayload.threadId);

    // Assert
    expect(mockThreadRepository.verifyAvailableThread).toBeCalledWith(useCasePayload.threadId);
    expect(mockThreadRepository.getThreadById).toBeCalledWith(useCasePayload.threadId);
    expect(mockCommentRepository.getCommentsByThreadId).toBeCalledWith(useCasePayload.threadId);
    expect(thread).toStrictEqual({
      ...expectedThread,
      comments: expectedComments,
    });
  });

  it('should not display deleted comment', async () => {
    // Arrange
    const useCasePayload = {
      threadId: 'thread-123',
    };

    const expectedThread = {
      id: useCasePayload.threadId,
      title: 'sebuah thread',
      body: 'sebuah body thread',
      date: '2021-08-08T07:22:33.555Z',
      username: 'dicoding',
      owner: 'user-123',
    };

    const mockThreadRepository = new ThreadRepository();
    const mockCommentRepository = new CommentRepository();

    // Mocking
    mockThreadRepository.verifyAvailableThread = jest.fn(() => Promise.resolve());
    mockThreadRepository.getThreadById = jest.fn(() => Promise.resolve({
      id: 'thread-123',
      title: 'sebuah thread',
      body: 'sebuah body thread',
      date: '2021-08-08T07:22:33.555Z',
      username: 'dicoding',
      owner: 'user-123',
    }));
    mockCommentRepository.getCommentsByThreadId = jest.fn(() => Promise.resolve([
      {
        id: 'comment-123',
        content: 'sebuah comment',
        date: '2021-08-08T07:22:33.555Z',
        username: 'dicoding',
        is_deleted: false,
      },
      {
        id: 'comment-456',
        content: 'comment kedua',
        date: '2021-08-08T07:22:33.555Z',
        username: 'dicoding',
        is_deleted: true,
      },
    ]));

    const getThreadByIdUseCase = new GetThreadByIdUseCase({
      threadRepository: mockThreadRepository,
      commentRepository: mockCommentRepository,
    });

    // Action
    const thread = await getThreadByIdUseCase.execute(useCasePayload.threadId);

    // Assert
    expect(thread).toStrictEqual({
      ...expectedThread,
      comments: [
        {
          id: 'comment-123',
          content: 'sebuah comment',
          date: '2021-08-08T07:22:33.555Z',
          username: 'dicoding',
        },
        {
          id: 'comment-456',
          content: '**komentar telah dihapus**',
          date: '2021-08-08T07:22:33.555Z',
          username: 'dicoding',
        },
      ],
    });
    expect(mockThreadRepository.verifyAvailableThread).toBeCalledWith(useCasePayload.threadId);
    expect(mockThreadRepository.getThreadById).toBeCalledWith(useCasePayload.threadId);
    expect(mockCommentRepository.getCommentsByThreadId).toBeCalledWith(useCasePayload.threadId);
  });
});
