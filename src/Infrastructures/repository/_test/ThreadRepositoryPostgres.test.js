const ThreadRepositoryPostgres = require('../ThreadRepositoryPostgres');
const ThreadsTableTestHelper = require('../../../../tests/ThreadsTableTestHelper');
const CommentsTableTestHelper = require('../../../../tests/CommentsTableTestHelper');
const pool = require('../../database/postgres/pool');
const NewThread = require('../../../Domains/threads/entities/NewThread');
const AddedThread = require('../../../Domains/threads/entities/AddedThread');
const NotFoundError = require('../../../Commons/exceptions/NotFoundError');
const AuthorizationError = require('../../../Commons/exceptions/AuthorizationError');
const UsersTableTestHelper = require('../../../../tests/UsersTableTestHelper');

describe('ThreadRepositoryPostgres', () => {
  it('should be instance of ThreadRepositoryPostgres domain', () => {
    const threadRepositoryPostgres = new ThreadRepositoryPostgres({}, {}); // dummy dependency

    expect(threadRepositoryPostgres).toBeInstanceOf(ThreadRepositoryPostgres);
  });

  describe('behavior test', () => {
    afterEach(async () => {
      await ThreadsTableTestHelper.cleanTable();
      await UsersTableTestHelper.cleanTable();
    });

    afterAll(async () => {
      await pool.end();
    });

    describe('addThread function', () => {
      it('should persist new thread and return added thread correctly', async () => {
        // Arrange

        await UsersTableTestHelper.addUser({
          id: 'user-123',
          username: 'dicoding',
          password: 'secret_password',
          fullname: 'Dicoding Indonesia',
        });

        const newThread = new NewThread({
          title: 'title',
          body: 'body',
          owner: 'user-123',
        });

        const fakeIdGenerator = () => '123'; // stub!
        const threadRepositoryPostgres = new ThreadRepositoryPostgres(pool, fakeIdGenerator);

        // Action
        const addedThread = await threadRepositoryPostgres.addThread(newThread);

        // Assert
        const threads = await ThreadsTableTestHelper.findThreadById('thread-123');
        expect(threads).toHaveLength(1);
        expect(addedThread).toStrictEqual(new AddedThread({
          id: 'thread-123',
          title: 'title',
          owner: 'user-123',
        }));
      });
    });

    describe('getThreadById function', () => {
      it('should return thread correctly', async () => {
        // Arrange
        const threadRepositoryPostgres = new ThreadRepositoryPostgres(pool, {});
        await UsersTableTestHelper.addUser({ id: 'user-123', username: 'dicoding' }); // memasukan user baru dengan id user-123
        await ThreadsTableTestHelper.addThread({ id: 'thread-123', owner: 'user-123' }); // memasukan thread baru dengan id thread-123 dan owner user-123

        // Action
        const thread = await threadRepositoryPostgres.getThreadById('thread-123', 'user-123');

        // Assert
        expect(thread).toStrictEqual({
          id: 'thread-123',
          title: 'title',
          body: 'body',
          date: '2021-08-08T07:22:33.555Z',
          username: 'dicoding',
          owner: 'user-123',
        });
      });
    });

    describe('verifyAvailableThread function', () => {
      it('should throw NotFoundError when thread not found', async () => {
        // Arrange
        const threadRepositoryPostgres = new ThreadRepositoryPostgres(pool, {});

        // Action & Assert
        await expect(threadRepositoryPostgres.verifyAvailableThread('thread-123')).rejects.toThrowError(NotFoundError);
      });

      it('should not throw NotFoundError when thread found', async () => {
        // Arrange
        const threadRepositoryPostgres = new ThreadRepositoryPostgres(pool, {});
        await UsersTableTestHelper.addUser({ id: 'user-123' });
        await ThreadsTableTestHelper.addThread({ id: 'thread-123', owner: 'user-123' });

        // Action & Assert
        await expect(threadRepositoryPostgres.verifyAvailableThread('thread-123')).resolves.not.toThrowError(NotFoundError);
      });
    });

    describe('getCommentsByThreadId function', () => {
      it('should return comments correctly', async () => {
      // Arrange
        const threadRepositoryPostgres = new ThreadRepositoryPostgres(pool, {});
        await UsersTableTestHelper.addUser({ id: 'user-123', username: 'dicoding' });
        await ThreadsTableTestHelper.addThread({ id: 'thread-123', owner: 'user-123' });
        await CommentsTableTestHelper.addComment({
          id: 'comment-123',
          owner: 'user-123',
          threadId: 'thread-123',
          date: '2021-08-08T07:22:33.555Z',
        });
        await CommentsTableTestHelper.addComment({
          id: 'comment-456',
          owner: 'user-123',
          threadId: 'thread-123',
          date: '2021-08-09T07:22:33.555Z',
        });

        // Action
        const comments = await threadRepositoryPostgres.getCommentsByThreadId('thread-123');

        // Assert
        expect(comments).toHaveLength(2);
        expect(comments).toStrictEqual([
          {
            id: 'comment-123',
            username: 'dicoding',
            date: '2021-08-08T07:22:33.555Z',
            content: 'comment',
            is_deleted: false,
          },
          {
            id: 'comment-456',
            username: 'dicoding',
            date: '2021-08-09T07:22:33.555Z',
            content: 'comment',
            is_deleted: false,
          },
        ]);
      });
    });
  });
});
