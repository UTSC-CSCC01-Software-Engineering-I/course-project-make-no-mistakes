import { io } from 'socket.io-client';
import { apiService } from './apiService.js';
import { meact } from './meact.js';

(function () {
  "use strict";

  const [commentsKey, getComments, setComments] = meact.useState([]);
  const [isProcessingKey, getIsProcessing, setIsProcessing] =
    meact.useState(false);

  const socket = io("http://localhost:3000");

  document.addEventListener("DOMContentLoaded", initialize);

  function initialize() {
    meact.useEffect(renderComments, [commentsKey]);
    meact.useEffect(renderProcessingState, [isProcessingKey]);

    const commentForm = document.getElementById("comment-form");

    if (commentForm) {
      commentForm.addEventListener("submit", handleCommentSubmit);
    }

    socket.on("comment_approved", function (newComment) {
      const currentComments = getComments();

      setComments([...currentComments, newComment]);
      setIsProcessing(false);
    });

    socket.on("comment_rejected", function (data) {
      const currentUserId = localStorage.getItem("user_id");

      if (
        currentUserId &&
        String(currentUserId) === String(data.userId)
      ) {
        alert(`Comment Rejected: ${data.reason}`);
        setIsProcessing(false);
      }
    });
  }

  function handleCommentSubmit(event) {
    event.preventDefault();

    const currentUserId = localStorage.getItem("user_id");

    if (!currentUserId) {
      promptLogin();
      return;
    }

    const contentInput =
      document.getElementById("comment-content-input");

    const content = contentInput.value;

    if (!content) return;

    setIsProcessing(true);
    contentInput.value = "";

    apiService
      .addComment(content)
      .catch(function () {
        alert("Failed to submit comment.");
        setIsProcessing(false);
      });
  }

  function renderProcessingState() {
    const submitBtn =
      document.getElementById("submit-comment-btn");

    const statusText =
      document.getElementById("ai-status-text");

    if (!submitBtn || !statusText) return;

    if (getIsProcessing()) {
      submitBtn.disabled = true;
      statusText.textContent =
        "AI is reviewing your comment...";
      statusText.classList.remove("hidden");
    } else {
      submitBtn.disabled = false;
      statusText.classList.add("hidden");
    }
  }

  function renderComments() {
    const container =
      document.getElementById("comments-container");

    if (!container) return;

    container.innerHTML = "";

    const comments = getComments();

    comments.forEach(function (comment) {
      container.appendChild(createCommentElement(comment));
    });
  }

  function createCommentElement(comment) {
    const element = document.createElement("div");
    element.className = "comment";

    const currentUserId =
      localStorage.getItem("user_id");

    const isAuthenticated =
      currentUserId !== null;

    const canDelete =
      currentUserId &&
      String(currentUserId) === String(comment.userId);

    const upvotes = comment.upvotes || 0;
    const downvotes = comment.downvotes || 0;

    element.innerHTML = `
      <div class="comment-user">
        <p>${escapeHtml(comment.content)}</p>
      </div>

      <div
        class="comment-actions"
        style="
          display: flex;
          gap: 10px;
          align-items: center;
          margin-top: 5px;
        "
      >
        <button
          class="upvote-btn"
          type="button"
          style="
            background: none;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
          "
        >
          <img
            src="/images/upvote-icon.png"
            alt="Upvote"
            style="width: 20px;"
          >
          <span>${upvotes}</span>
        </button>

        <button
          class="downvote-btn"
          type="button"
          style="
            background: none;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
          "
        >
          <img
            src="/images/downvote-icon.png"
            alt="Downvote"
            style="width: 20px;"
          >
          <span>${downvotes}</span>
        </button>

        ${
          canDelete
            ? `
              <button
                class="delete-comment-button"
                type="button"
                style="
                  background: none;
                  border: none;
                  cursor: pointer;
                  margin-left: auto;
                "
              >
                <img
                  src="/images/delete-icon.png"
                  alt="Delete"
                  style="width: 20px;"
                >
              </button>
            `
            : ""
        }
      </div>
    `;

    if (isAuthenticated) {
      element
        .querySelector(".upvote-btn")
        .addEventListener("click", function () {
          apiService
            .updateCommentVote(comment.id, "upvote")
            .then(updateSingleComment);
        });

      element
        .querySelector(".downvote-btn")
        .addEventListener("click", function () {
          apiService
            .updateCommentVote(comment.id, "downvote")
            .then(updateSingleComment);
        });
    } else {
      element
        .querySelector(".upvote-btn")
        .addEventListener("click", promptLogin);

      element
        .querySelector(".downvote-btn")
        .addEventListener("click", promptLogin);
    }

    if (canDelete) {
      element
        .querySelector(".delete-comment-button")
        .addEventListener("click", function () {
          apiService
            .deleteComment(comment.id)
            .then(function () {
              const filtered = getComments().filter(
                commentItem =>
                  commentItem.id !== comment.id
              );

              setComments(filtered);
            });
        });
    }

    return element;
  }

  function updateSingleComment(updatedComment) {
    const comments = getComments();

    const newComments = comments.map(function (comment) {
      return comment.id === updatedComment.id
        ? updatedComment
        : comment;
    });

    setComments(newComments);
  }

  function promptLogin() {
    const authModal =
      document.getElementById("auth-modal");

    if (authModal) {
      authModal.classList.remove("hidden");
    } else {
      alert("Please log in to use comment features.");
    }
  }

  function escapeHtml(value) {
    if (!value) return "";

    const div = document.createElement("div");
    div.textContent = value;

    return div.innerHTML;
  }
})();