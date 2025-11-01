import { GraphQLClient, gql } from "graphql-request";
import { config } from "../config/env.js";

const linearClient = new GraphQLClient("https://api.linear.app/graphql", {
  headers: {
    Authorization: config.linear.apiKey,
    "Content-Type": "application/json",
  },
});

export const linearApi = {
  async createProject(data) {
    try {
      const mutation = gql`
        mutation ProjectCreate($input: ProjectCreateInput!) {
          projectCreate(input: $input) {
            success
            project {
              id
              name
              description
              targetDate
              lead {
                id
                email
              }
            }
          }
        }
      `;

      const input = {
        name: data.name,
        description: data.description,
        teamIds: [data.teamId],
      };

      if (data.targetDate) {
        input.targetDate = data.targetDate;
      }
      if (data.leadId) {
        input.leadId = data.leadId;
      }

      const result = await linearClient.request(mutation, { input });
      return result.projectCreate.project;
    } catch (error) {
      console.error("[Linear API] Error creating project:", error.message);
      if (error.response) {
        console.error(
          "[Linear API] Response:",
          JSON.stringify(error.response, null, 2)
        );
      }
      throw error;
    }
  },

  async getProject(id) {
    try {
      const query = gql`
        query Project($id: String!) {
          project(id: $id) {
            id
            name
            description
            state
            progress
            targetDate
            lead {
              id
              email
            }
          }
        }
      `;

      const result = await linearClient.request(query, { id });
      return result.project;
    } catch (error) {
      console.error("[Linear API] Error getting project:", error.message);
      throw error;
    }
  },

  async updateProject(id, data) {
    try {
      const mutation = gql`
        mutation ProjectUpdate($id: String!, $input: ProjectUpdateInput!) {
          projectUpdate(id: $id, input: $input) {
            success
            project {
              id
              name
              description
              state
              targetDate
            }
          }
        }
      `;

      const input = {};
      if (data.name !== undefined) input.name = data.name;
      if (data.description !== undefined) input.description = data.description;
      if (data.state !== undefined) input.state = data.state;
      if (data.targetDate !== undefined) input.targetDate = data.targetDate;
      if (data.leadId !== undefined) input.leadId = data.leadId;

      console.log("[Linear API] Updating project with:", input);

      const result = await linearClient.request(mutation, { id, input });
      return result.projectUpdate.project;
    } catch (error) {
      console.error("[Linear API] Error updating project:", error.message);
      throw error;
    }
  },

  async createComment(projectId, body) {
    try {
      const mutation = gql`
        mutation CommentCreate($input: CommentCreateInput!) {
          commentCreate(input: $input) {
            success
            comment {
              id
              body
              createdAt
            }
          }
        }
      `;

      const result = await linearClient.request(mutation, {
        input: {
          projectId,
          body,
        },
      });

      return result.commentCreate.comment;
    } catch (error) {
      console.error("[Linear API] Error creating comment:", error.message);
      throw error;
    }
  },

  async getUsers() {
    try {
      const query = gql`
        query {
          users {
            nodes {
              id
              email
              name
              active
            }
          }
        }
      `;

      const result = await linearClient.request(query);
      return result.users.nodes.filter((u) => u.active);
    } catch (error) {
      console.error("[Linear API] Error getting users:", error.message);
      throw error;
    }
  },

  async getUserByEmail(email) {
    try {
      const users = await this.getUsers();
      return users.find((u) => u.email?.toLowerCase() === email?.toLowerCase());
    } catch (error) {
      console.error("[Linear API] Error getting user by email:", error.message);
      return null; // Don't throw, just return null if user not found
    }
  },

  async getProjectIssues(projectId) {
    try {
      const query = gql`
        query Issues($filter: IssueFilter!) {
          issues(filter: $filter) {
            nodes {
              id
              completedAt
              state {
                name
                type
              }
            }
          }
        }
      `;

      const result = await linearClient.request(query, {
        filter: {
          project: { id: { eq: projectId } },
        },
      });

      return result.issues.nodes;
    } catch (error) {
      console.error(
        "[Linear API] Error getting project issues:",
        error.message
      );
      throw error;
    }
  },
};
