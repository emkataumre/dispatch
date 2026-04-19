export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4";
  };
  public: {
    Tables: {
      check_ins: {
        Row: {
          checked_in_at: string;
          id: string;
          poi_id: string;
          semester_id: string | null;
          user_id: string;
        };
        Insert: {
          checked_in_at?: string;
          id?: string;
          poi_id: string;
          semester_id?: string | null;
          user_id: string;
        };
        Update: {
          checked_in_at?: string;
          id?: string;
          poi_id?: string;
          semester_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "check_ins_poi_id_fkey";
            columns: ["poi_id"];
            isOneToOne: false;
            referencedRelation: "pois";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "check_ins_semester_id_fkey";
            columns: ["semester_id"];
            isOneToOne: false;
            referencedRelation: "semesters";
            referencedColumns: ["id"];
          },
        ];
      };
      friendships: {
        Row: {
          addressee_id: string;
          created_at: string;
          id: string;
          requester_id: string;
          status: Database["public"]["Enums"]["friendship_status"];
        };
        Insert: {
          addressee_id: string;
          created_at?: string;
          id?: string;
          requester_id: string;
          status: Database["public"]["Enums"]["friendship_status"];
        };
        Update: {
          addressee_id?: string;
          created_at?: string;
          id?: string;
          requester_id?: string;
          status?: Database["public"]["Enums"]["friendship_status"];
        };
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey";
            columns: ["addressee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "friendships_requester_id_fkey";
            columns: ["requester_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      live_presence: {
        Row: {
          created_at: string;
          dismissed_at: string | null;
          expires_at: string;
          id: string;
          message: string | null;
          poi_id: string;
          user_id: string;
          visible_to: Database["public"]["Enums"]["visibility_type"];
        };
        Insert: {
          created_at?: string;
          dismissed_at?: string | null;
          expires_at?: string;
          id?: string;
          message?: string | null;
          poi_id: string;
          user_id: string;
          visible_to?: Database["public"]["Enums"]["visibility_type"];
        };
        Update: {
          created_at?: string;
          dismissed_at?: string | null;
          expires_at?: string;
          id?: string;
          message?: string | null;
          poi_id?: string;
          user_id?: string;
          visible_to?: Database["public"]["Enums"]["visibility_type"];
        };
        Relationships: [
          {
            foreignKeyName: "live_presence_poi_id_fkey";
            columns: ["poi_id"];
            isOneToOne: false;
            referencedRelation: "pois";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "live_presence_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      poi_ratings: {
        Row: {
          comment: string | null;
          created_at: string | null;
          id: string;
          poi_id: string;
          rating: number;
          user_id: string;
        };
        Insert: {
          comment?: string | null;
          created_at?: string | null;
          id?: string;
          poi_id: string;
          rating: number;
          user_id: string;
        };
        Update: {
          comment?: string | null;
          created_at?: string | null;
          id?: string;
          poi_id?: string;
          rating?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "poi_ratings_poi_id_fkey";
            columns: ["poi_id"];
            isOneToOne: false;
            referencedRelation: "pois";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "poi_ratings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      pois: {
        Row: {
          category: Database["public"]["Enums"]["poi_category"];
          created_at: string | null;
          created_by: string | null;
          description: string;
          id: string;
          lat: number;
          lng: number;
          name: string;
        };
        Insert: {
          category: Database["public"]["Enums"]["poi_category"];
          created_at?: string | null;
          created_by?: string | null;
          description: string;
          id: string;
          lat: number;
          lng: number;
          name: string;
        };
        Update: {
          category?: Database["public"]["Enums"]["poi_category"];
          created_at?: string | null;
          created_by?: string | null;
          description?: string;
          id?: string;
          lat?: number;
          lng?: number;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pois_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      presence_joins: {
        Row: {
          confirmed: boolean;
          id: string;
          joined_at: string;
          joiner_user_id: string;
          presence_id: string;
        };
        Insert: {
          confirmed?: boolean;
          id?: string;
          joined_at?: string;
          joiner_user_id: string;
          presence_id: string;
        };
        Update: {
          confirmed?: boolean;
          id?: string;
          joined_at?: string;
          joiner_user_id?: string;
          presence_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "presence_joins_joiner_user_id_fkey";
            columns: ["joiner_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "presence_joins_presence_id_fkey";
            columns: ["presence_id"];
            isOneToOne: false;
            referencedRelation: "live_presence";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          display_name: string;
          id: string;
          semester_id: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          display_name: string;
          id: string;
          semester_id?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          display_name?: string;
          id?: string;
          semester_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_semester_id_fkey";
            columns: ["semester_id"];
            isOneToOne: false;
            referencedRelation: "semesters";
            referencedColumns: ["id"];
          },
        ];
      };
      push_tokens: {
        Row: {
          expo_push_token: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          expo_push_token: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          expo_push_token?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      semesters: {
        Row: {
          created_at: string | null;
          end_date: string;
          id: string;
          name: string;
          start_date: string;
        };
        Insert: {
          created_at?: string | null;
          end_date: string;
          id?: string;
          name: string;
          start_date: string;
        };
        Update: {
          created_at?: string | null;
          end_date?: string;
          id?: string;
          name?: string;
          start_date?: string;
        };
        Relationships: [];
      };
      user_badges: {
        Row: {
          awarded_at: string;
          badge_id: string;
          id: string;
          semester_id: string;
          user_id: string;
        };
        Insert: {
          awarded_at?: string;
          badge_id: string;
          id?: string;
          semester_id: string;
          user_id: string;
        };
        Update: {
          awarded_at?: string;
          badge_id?: string;
          id?: string;
          semester_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_badges_semester_id_fkey";
            columns: ["semester_id"];
            isOneToOne: false;
            referencedRelation: "semesters";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      poi_avg_ratings: {
        Row: {
          avg_rating: number | null;
          poi_id: string | null;
          rating_count: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "poi_ratings_poi_id_fkey";
            columns: ["poi_id"];
            isOneToOne: false;
            referencedRelation: "pois";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      checkin_window: { Args: { ts: string }; Returns: unknown };
      claim_push_token: { Args: { token: string }; Returns: boolean };
      generate_upcoming_semesters: { Args: never; Returns: undefined };
      get_passport_stats: {
        Args: { p_semester_id: string };
        Returns: {
          most_visited_count: number;
          most_visited_name: string;
          total_check_ins: number;
          unique_pois: number;
        }[];
      };
    };
    Enums: {
      friendship_status: "pending" | "accepted";
      poi_category: "food_drink" | "nightlife" | "culture" | "study_spots" | "hidden_gems";
      visibility_type: "friends" | "community";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      friendship_status: ["pending", "accepted"],
      poi_category: ["food_drink", "nightlife", "culture", "study_spots", "hidden_gems"],
      visibility_type: ["friends", "community"],
    },
  },
} as const;
