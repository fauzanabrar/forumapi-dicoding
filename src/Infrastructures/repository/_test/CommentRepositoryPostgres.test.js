const CommentRepository = require('../../../Domains/comments/CommentRepository');
const CommentRepositoryPostgres = require('../CommentRepositoryPostgres');
const pool = require('../../database/postgres/pool');
const NewComment = require('../../../Domains/comments/entities/NewComment');
const AddedComment = require('../../../Domains/comments/entities/AddedComment');
const NotFoundError = require('../../../Commons/exceptions/NotFoundError');
const AuthorizationError = require('../../../Commons/exceptions/AuthorizationError');
const CommentsTableTestHelper = require('../../../../tests/CommentsTableTestHelper');
const ThreadsTableTestHelper = require('../../../../tests/ThreadsTableTestHelper');
const UsersTableTestHelper = require('../../../../tests/UsersTableTestHelper');

describe('CommentRepositoryPostgres', () => {
  it('should be instance of CommentRepository domain', () => {
    const commentRepositoryPostgres = new CommentRepositoryPostgres({}, {}); // dummy dependency

    expect(commentRepositoryPostgres).toBeInstanceOf(CommentRepository);
  });

  describe('behavior test', () => {
    beforeAll(async () => {
      await UsersTableTestHelper.addUser({ id: 'user-123', username: 'dicoding', password: 'secret' });
      await ThreadsTableTestHelper.addThread({
        id: 'thread-123', title: 'dicoding', body: 'secret', owner: 'user-123',
      });
    });

    afterEach(async () => {
      await CommentsTableTestHelper.cleanTable();
    });

    afterAll(async () => {
      await CommentsTableTestHelper.cleanTable();
      await ThreadsTableTestHelper.cleanTable();
      await UsersTableTestHelper.cleanTable();
      await pool.end();
    });

    describe('addComment function', () => {
      it('should persist new comment and return added comment correctly', async () => {
        // Arrange
        const newComment = new NewComment({
          content: 'dicoding',
          owner: 'user-123',
          threadId: 'thread-123',
        });
        const fakeIdGenerator = () => '123'; // stub!
        const commentRepositoryPostgres = new CommentRepositoryPostgres(pool, fakeIdGenerator);

        // Action
        const addedComment = await commentRepositoryPostgres.addComment(newComment);
        const comments = await CommentsTableTestHelper.findCommentById(addedComment.id);

        // Assert
        expect(addedComment).toStrictEqual(new AddedComment({
          id: 'comment-123',
          content: 'dicoding',
          owner: 'user-123',
        }));
        expect(comments).toHaveLength(1);
      });
    });

    describe('verifyCommentExist function', () => {
      it('should throw NotFoundError when comment not found', async () => {
        // Arrange
        const commentRepositoryPostgres = new CommentRepositoryPostgres(pool, {});

        // Action & Assert
        await expect(commentRepositoryPostgres.verifyCommentExist('comment-123')).rejects.toThrowError(NotFoundError);
      });

      it('should not throw NotFoundError when comment found', async () => {
        // Arrange
        await CommentsTableTestHelper.addComment({
          id: 'comment-123', content: 'dicoding', owner: 'user-123', threadId: 'thread-123',
        });
        const commentRepositoryPostgres = new CommentRepositoryPostgres(pool, {});

        // Action & Assert
        await expect(commentRepositoryPostgres.verifyCommentExist('comment-123')).resolves.not.toThrowError(NotFoundError);
      });
    });

    describe('verifyCommentOwner function', () => {
      it('should throw AuthorizationError when comment owner is not the same with user id', async () => {
        // Arrange
        await CommentsTableTestHelper.addComment({
          id: 'comment-123', content: 'dicoding', owner: 'user-123', threadId: 'thread-123',
        });
        const commentRepositoryPostgres = new CommentRepositoryPostgres(pool, {});

        // Action & Assert
        await expect(commentRepositoryPostgres.verifyCommentOwner('comment-123', 'user-456')).rejects.toThrowError(AuthorizationError);
      });

      it('should not throw AuthorizationError when comment owner is the same with user id', async () => {
        // Arrange
        await CommentsTableTestHelper.addComment({
          id: 'comment-123', content: 'dicoding', owner: 'user-123', threadId: 'thread-123',
        });
        const commentRepositoryPostgres = new CommentRepositoryPostgres(pool, {});

        // Action & Assert
        await expect(commentRepositoryPostgres.verifyCommentOwner('comment-123', 'user-123')).resolves.not.toThrowError(AuthorizationError);
      });
    });

    describe('getCommentsByThreadId function', () => {
      it('should return comments correctly', async () => {
        // Arrange
        await CommentsTableTestHelper.addComment({
          id: 'comment-123', content: 'dicoding', owner: 'user-123', threadId: 'thread-123', date: '2021-08-08T07:22:33.555Z',
        });
        await CommentsTableTestHelper.addComment({
          id: 'comment-456', content: 'dicoding', owner: 'user-123', threadId: 'thread-123', date: '2021-08-09T07:22:33.555Z',
        });
        const commentRepositoryPostgres = new CommentRepositoryPostgres(pool, {});

        // Action
        const comments = await commentRepositoryPostgres.getCommentsByThreadId('thread-123');

        // Assert
        expect(comments).toHaveLength(2);
        expect(comments).toStrictEqual([
          {
            id: 'comment-123',
            username: 'dicoding',
            date: '2021-08-08T07:22:33.555Z',
            content: 'dicoding',
            is_deleted: false,
          },
          {
            id: 'comment-456',
            username: 'dicoding',
            date: '2021-08-09T07:22:33.555Z',
            content: 'dicoding',
            is_deleted: false,
          },
        ]);
      });

      it('should return empty array when thread no comment exist', async () => {
        // Arrange
        const commentRepositoryPostgres = new CommentRepositoryPostgres(pool, {});

        // Action
        const comments = await commentRepositoryPostgres.getCommentsByThreadId('thread-123');

        // Assert
        expect(comments).toHaveLength(0);
      });
    });

    describe('getCommentById function', () => {
      it('should return comment correctly', async () => {
        // Arrange
        await CommentsTableTestHelper.addComment({
          id: 'comment-123', content: 'dicoding', owner: 'user-123', threadId: 'thread-123',
        });
        const commentRepositoryPostgres = new CommentRepositoryPostgres(pool, {});

        // Action
        const comment = await commentRepositoryPostgres.getCommentById('comment-123');

        // Assert
        expect(comment).toStrictEqual({
          id: 'comment-123',
          username: 'dicoding',
          date: '2021-08-08T07:22:33.555Z',
          content: 'dicoding',
        });
      });

      it('should return comment correctly when comment is deleted', async () => {
        // Arrange
        await CommentsTableTestHelper.addComment({
          id: 'comment-123', content: 'dicoding', owner: 'user-123', threadId: 'thread-123', is_deleted: true,
        });
        const commentRepositoryPostgres = new CommentRepositoryPostgres(pool, {});

        // Action
        const comment = await commentRepositoryPostgres.getCommentById('comment-123');

        // Assert
        expect(comment.id).toStrictEqual('comment-123');
      });
    });

    describe('deleteCommentById function', () => {
      it('should delete comment correctly', async () => {
        // Arrange
        await CommentsTableTestHelper.addComment({
          id: 'comment-123', content: 'dicoding', owner: 'user-123', threadId: 'thread-123',
        });
        const commentRepositoryPostgres = new CommentRepositoryPostgres(pool, {});

        // Action
        await commentRepositoryPostgres.deleteCommentById('comment-123');

        const comment = await CommentsTableTestHelper.findCommentById('comment-123');

        // Assert
        expect(comment[0].is_deleted).toStrictEqual(true);
      });
    });
  });
});
