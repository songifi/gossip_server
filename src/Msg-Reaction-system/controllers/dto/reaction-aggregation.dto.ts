export interface ReactionAggregationDto {
    reactionIdentifier: string;
    type: ReactionType;
    count: number;
    users: {
      id: string;
      username: string;
    }[];
    customReaction?: {
      id: string;
      name: string;
      imageUrl: string;
    };
  }
  