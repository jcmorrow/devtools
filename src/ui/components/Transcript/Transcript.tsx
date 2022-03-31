import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { selectors } from "ui/reducers";
import hooks from "ui/hooks";
import CommentCard from "ui/components/Comments/TranscriptComments/CommentCard";
import useAuth0 from "ui/utils/useAuth0";
import MaterialIcon from "ui/components/shared/MaterialIcon";
import { sortBy } from "lodash";

export default function Transcript() {
  const recordingId = hooks.useGetRecordingId();
  const { comments, loading } = hooks.useGetComments(recordingId);
  const recording = hooks.useGetRecording(recordingId);
  const auth = useAuth0();

  const pendingComments = Object.values(useSelector(selectors.getPendingComments));
  const { isAuthenticated } = useAuth0();

  console.log({ pendingComments });
  const notInCache = comments.filter(
    c => !pendingComments.map(nr => nr.persistedAs).includes(c.id)
  );
  const topLevelPendingComments = pendingComments.map(pc => pc.comment);
  const displayedComments = [...topLevelPendingComments, ...notInCache];
  const sortedComments = sortBy(displayedComments, ["time", "createdAt"]);
  console.log({
    pendingComments: pendingComments.map(x => [x.persistedAs, x.comment.id]),
    notInCache: notInCache.map(x => [x.id]),
    displayedComments: displayedComments.map(x => x.id),
    sortedComments: sortedComments.map(x => x.id),
  });

  if (loading || auth.isLoading || recording.loading) {
    return null;
  }

  return (
    <div className="right-sidebar">
      <div className="right-sidebar-toolbar">
        <div className="right-sidebar-toolbar-item comments">Comments</div>
      </div>
      <div className="transcript-list flex h-full flex-grow flex-col items-center overflow-auto overflow-x-hidden bg-bodyBgcolor text-xs">
        {sortedComments.length > 0 ? (
          <div className="w-full flex-grow overflow-auto bg-bodyBgcolor">
            {sortedComments.map(comment => (
              <div
                className={
                  pendingComments.map(c => c.comment.id).includes(comment.id)
                    ? "border border-red-500"
                    : "border border-blue-500"
                }
              >
                <CommentCard
                  editing={
                    !!pendingComments.find(c => c.comment.id === comment.id && !c.persistedAs)
                  }
                  comments={displayedComments}
                  comment={comment}
                  key={comment.id}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="transcript-list onboarding-text space-y-3 self-stretch p-3 text-base text-gray-500">
            <MaterialIcon className="forum large-icon">forum</MaterialIcon>
            <h2>{isAuthenticated ? "Start a conversation" : "Sign in to get started"}</h2>
            <p>
              {isAuthenticated
                ? "Add a comment to the video, a line of code, or a console message."
                : "Once signed in, you can add comments and make your voice heard!"}
            </p>
            <img src="/images/comment-onboarding-arrow.svg" className="arrow" />
          </div>
        )}
      </div>
    </div>
  );
}
