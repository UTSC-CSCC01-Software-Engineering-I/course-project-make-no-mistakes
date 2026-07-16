export const apiService = (function () {
    "use strict";
  
    function checkStatus(res) {
      if (!res.ok) throw new Error(res.statusText);
      return res;
    }
  
    // Helper to get auth token using JWTs (or omit if using cookies)
    const getHeaders = () => ({
      "Content-Type": "application/json",
      "Authorization": `Bearer ${localStorage.getItem('token')}` // Use tokens
    });
  
    return {
      addComment: function (content) {
        return fetch(`/api/comments`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ content }),
        })
          .then(checkStatus)
          .then((res) => res.json());
      },
  
      deleteComment: function (commentId) {
        return fetch(`/api/comments/${commentId}`, {
          method: "DELETE",
          headers: getHeaders(),
        }).then(checkStatus);
      },
  
      updateCommentVote: function (commentId, action) {
        return fetch(`/api/comments/${commentId}/vote`, {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({ action }), // 'upvote' or 'downvote'
        })
          .then(checkStatus)
          .then((res) => res.json());
      },
    };
  })();