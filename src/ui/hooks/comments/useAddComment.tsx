import { Comment } from "ui/state/comments";
import { gql, useMutation } from "@apollo/client";
import { trackEvent } from "ui/utils/telemetry";
import omit from "lodash/omit";
import { AddComment, AddCommentVariables } from "graphql/AddComment";

export default function useAddComment() {
  const [addComment, { error }] = useMutation<AddComment, AddCommentVariables>(
    gql`
      mutation AddComment($input: AddCommentInput!) {
        addComment(input: $input) {
          success
          comment {
            id
          }
        }
      }
    `
  );

  if (error) {
    console.error("Apollo error while adding a comment:", error);
  }

  return (comment: Comment) => {
    trackEvent("comments.create");

    return addComment({
      variables: {
        input: {
          ...omit(comment, ["id", "createdAt", "updatedAt", "replies", "user"]),
          recordingId: comment.recordingId,
        },
      },
    });
  };
}
