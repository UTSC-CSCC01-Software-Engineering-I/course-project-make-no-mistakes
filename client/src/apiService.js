/**
 * Frontend API helpers — fetch only. No business/DB logic here.
 * Auth JWT is from the AUTH Supabase project (stored as `sb_token`).
 */
export const apiService = (function () {
  "use strict";

  function checkStatus(res) {
    if (!res.ok) {
      return res.text().then((text) => {
        let message = res.statusText;
        try {
          const body = JSON.parse(text);
          message = body.error || body.message || message;
        } catch {
          if (text) message = text;
        }
        const err = new Error(message);
        err.status = res.status;
        throw err;
      });
    }
    return res;
  }

  function getAuthHeaders() {
    const token = localStorage.getItem("sb_token");
    const headers = { "Content-Type": "application/json" };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  async function parseJson(res) {
    if (res.status === 204) return null;
    return res.json();
  }

  return {
    getProposals: function ({ sort = "newest", minVotes = 0, page = 0, limit = 20 } = {}) {
      const params = new URLSearchParams({
        sort: String(sort),
        minVotes: String(minVotes),
        page: String(page),
        limit: String(limit),
      });

      return fetch(`/api/proposals?${params}`, {
        credentials: "same-origin",
      })
        .then(checkStatus)
        .then(parseJson);
    },

    getProposal: function (id) {
      return fetch(`/api/proposals/${encodeURIComponent(id)}`, {
        credentials: "same-origin",
        headers: getAuthHeaders(),
      })
        .then(checkStatus)
        .then(parseJson);
    },

    getComments: function (proposalId) {
      return fetch(`/api/proposals/${encodeURIComponent(proposalId)}/comments`, {
        credentials: "same-origin",
        headers: getAuthHeaders(),
      })
        .then(checkStatus)
        .then(parseJson);
    },

    addComment: function (proposalId, content, extra = {}) {
      return fetch(`/api/proposals/${encodeURIComponent(proposalId)}/comments`, {
        method: "POST",
        credentials: "same-origin",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          content,
          authorName: extra.authorName || localStorage.getItem("user_email") || undefined,
          relatedRidings: extra.relatedRidings,
        }),
      })
        .then(checkStatus)
        .then(parseJson);
    },

    deleteComment: function (commentId) {
      return fetch(`/api/comments/${encodeURIComponent(commentId)}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: getAuthHeaders(),
      }).then(checkStatus);
    },

    /** @param {number} value 1 = thumbs up, -1 = thumbs down */
    voteProposal: function (proposalId, value) {
      return fetch(`/api/proposals/${encodeURIComponent(proposalId)}/vote`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: getAuthHeaders(),
        body: JSON.stringify({ value }),
      })
        .then(checkStatus)
        .then(parseJson);
    },

    /** @param {number} value 1 = thumbs up, -1 = thumbs down */
    voteComment: function (commentId, value) {
      return fetch(`/api/comments/${encodeURIComponent(commentId)}/vote`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: getAuthHeaders(),
        body: JSON.stringify({ value }),
      })
        .then(checkStatus)
        .then(parseJson);
    },

    /** @deprecated use voteComment(commentId, 1|-1) */
    updateCommentVote: function (commentId, action) {
      const value = action === "downvote" ? -1 : 1;
      return this.voteComment(commentId, value);
    },

    getUserSubmissions: function ({ type } = {}) {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      const qs = params.toString();

      return fetch(`/api/users/me/submissions${qs ? `?${qs}` : ""}`, {
        credentials: "same-origin",
        headers: getAuthHeaders(),
      })
        .then(checkStatus)
        .then(parseJson);
    },

    createSubmission: function (payload) {
      return fetch(`/api/users/me/submissions`, {
        method: "POST",
        credentials: "same-origin",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })
        .then(checkStatus)
        .then(parseJson);
    },
  };
})();
