
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "challenges": {
                  Row: {
                    "created_at": string,"created_by": string,"description": string,"end_date": string,"id": string,"start_date": string,"timezone": string,"title": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string,"description"?: string,"end_date": string,"id"?: string,"start_date": string,"timezone": string,"title": string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"description"?: string,"end_date"?: string,"id"?: string,"start_date"?: string,"timezone"?: string,"title"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "challenges_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "challenges_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"checkins": {
                  Row: {
                    "accomplishment": string,"challenge_id": string,"checkin_date": string,"created_at": string,"id": string,"next_plan": string,"notes": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accomplishment": string,"challenge_id": string,"checkin_date": string,"created_at"?: string,"id"?: string,"next_plan": string,"notes"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "accomplishment"?: string,"challenge_id"?: string,"checkin_date"?: string,"created_at"?: string,"id"?: string,"next_plan"?: string,"notes"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "checkins_challenge_id_fkey"
      columns: ["challenge_id"]
isOneToOne: false
      referencedRelation: "challenge_status"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checkins_challenge_id_fkey"
      columns: ["challenge_id"]
isOneToOne: false
      referencedRelation: "challenges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checkins_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"goal_progress_history": {
                  Row: {
                    "changed_by": string | null,"goal_id": string,"id": string,"progress_current": number,"progress_target": number | null,"progress_unit": string | null,"recorded_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_by"?: string | null,"goal_id": string,"id"?: string,"progress_current": number,"progress_target"?: number | null,"progress_unit"?: string | null,"recorded_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "changed_by"?: string | null,"goal_id"?: string,"id"?: string,"progress_current"?: number,"progress_target"?: number | null,"progress_unit"?: string | null,"recorded_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "goal_progress_history_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "goal_progress_history_goal_id_fkey"
      columns: ["goal_id"]
isOneToOne: false
      referencedRelation: "goals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "goal_progress_history_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"goals": {
                  Row: {
                    "challenge_id": string,"created_at": string,"deleted_at": string | null,"description": string,"id": string,"owner_id": string,"progress_current": number,"progress_target": number | null,"progress_unit": string | null,"status": Database["public"]['Enums']["goal_status"],"title": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "challenge_id": string,"created_at"?: string,"deleted_at"?: string | null,"description"?: string,"id"?: string,"owner_id"?: string,"progress_current"?: number,"progress_target"?: number | null,"progress_unit"?: string | null,"status"?: Database["public"]['Enums']["goal_status"],"title": string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "challenge_id"?: string,"created_at"?: string,"deleted_at"?: string | null,"description"?: string,"id"?: string,"owner_id"?: string,"progress_current"?: number,"progress_target"?: number | null,"progress_unit"?: string | null,"status"?: Database["public"]['Enums']["goal_status"],"title"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "goals_challenge_id_workspace_id_fkey"
      columns: ["challenge_id","workspace_id"]
isOneToOne: false
      referencedRelation: "challenge_status"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "goals_challenge_id_workspace_id_fkey"
      columns: ["challenge_id","workspace_id"]
isOneToOne: false
      referencedRelation: "challenges"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "goals_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "goals_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"created_at": string,"display_name": string,"id": string,"tagline": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"created_at"?: string,"display_name": string,"id": string,"tagline"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "avatar_path"?: string | null,"created_at"?: string,"display_name"?: string,"id"?: string,"tagline"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"tasks": {
                  Row: {
                    "assignee_id": string | null,"challenge_id": string,"created_at": string,"deleted_at": string | null,"description": string,"due_date": string | null,"id": string,"owner_id": string,"status": Database["public"]['Enums']["task_status"],"title": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignee_id"?: string | null,"challenge_id": string,"created_at"?: string,"deleted_at"?: string | null,"description"?: string,"due_date"?: string | null,"id"?: string,"owner_id"?: string,"status"?: Database["public"]['Enums']["task_status"],"title": string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "assignee_id"?: string | null,"challenge_id"?: string,"created_at"?: string,"deleted_at"?: string | null,"description"?: string,"due_date"?: string | null,"id"?: string,"owner_id"?: string,"status"?: Database["public"]['Enums']["task_status"],"title"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_assignee_id_fkey"
      columns: ["assignee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_challenge_id_workspace_id_fkey"
      columns: ["challenge_id","workspace_id"]
isOneToOne: false
      referencedRelation: "challenge_status"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "tasks_challenge_id_workspace_id_fkey"
      columns: ["challenge_id","workspace_id"]
isOneToOne: false
      referencedRelation: "challenges"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "tasks_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspace_invites": {
                  Row: {
                    "created_at": string,"created_by": string,"expires_at": string,"id": string,"max_uses": number,"revoked_at": string | null,"token_hash": string,"updated_at": string,"use_count": number,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"expires_at": string,"id"?: string,"max_uses"?: number,"revoked_at"?: string | null,"token_hash": string,"updated_at"?: string,"use_count"?: number,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"expires_at"?: string,"id"?: string,"max_uses"?: number,"revoked_at"?: string | null,"token_hash"?: string,"updated_at"?: string,"use_count"?: number,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspace_invites_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workspace_invites_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspace_members": {
                  Row: {
                    "created_at": string,"role": Database["public"]['Enums']["workspace_role"],"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"role"?: Database["public"]['Enums']["workspace_role"],"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"role"?: Database["public"]['Enums']["workspace_role"],"user_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspace_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workspace_members_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspaces": {
                  Row: {
                    "created_at": string,"created_by": string,"id": string,"name": string,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"id"?: string,"name": string,"timezone": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"id"?: string,"name"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspaces_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "challenge_status": {
                  Row: {
                    "created_at": string,"created_by": string,"day_number": number | null,"days_remaining": number | null,"description": string,"end_date": string,"id": string,"start_date": string,"status": string | null,"timezone": string,"title": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                           "created_at"?: string | null,"created_by"?: string | null,"day_number"?: never,"days_remaining"?: never,"description"?: string | null,"end_date"?: string | null,"id"?: string | null,"start_date"?: string | null,"status"?: never,"timezone"?: string | null,"title"?: string | null,"updated_at"?: string | null,"workspace_id"?: string | null
                         }
                        Update: {
                           "created_at"?: string | null,"created_by"?: string | null,"day_number"?: never,"days_remaining"?: never,"description"?: string | null,"end_date"?: string | null,"id"?: string | null,"start_date"?: string | null,"status"?: never,"timezone"?: string | null,"title"?: string | null,"updated_at"?: string | null,"workspace_id"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "challenges_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "challenges_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "create_invite":
{ Args: { "p_expires_at": string,"p_max_uses"?: number,"p_token_hash": string,"p_workspace_id": string }; Returns: string
                           },
"create_workspace":
{ Args: { "p_name": string,"p_timezone": string }; Returns: string
                           },
"get_challenge_calendar":
{ Args: { "p_challenge_id": string,"p_days"?: number,"p_member_id"?: string }; Returns: {
              "checkin_count": number,"local_date": string
            }[]
                           },
"get_challenge_progress":
{ Args: { "p_challenge_id": string }; Returns: {
              "checked_in_today": boolean,"completed_days": number,"current_streak": number,"display_name": string,"elapsed_days": number,"last_checkin": string,"longest_streak": number,"user_id": string
            }[]
                           },
"is_challenge_member":
{ Args: { "p_challenge_id": string }; Returns: boolean
                           },
"is_challenge_owner":
{ Args: { "p_challenge_id": string }; Returns: boolean
                           },
"is_valid_timezone":
{ Args: { "p_timezone": string }; Returns: boolean
                           },
"is_workspace_member":
{ Args: { "p_workspace_id": string }; Returns: boolean
                           },
"is_workspace_owner":
{ Args: { "p_workspace_id": string }; Returns: boolean
                           },
"leave_workspace":
{ Args: { "p_workspace_id": string }; Returns: undefined
                           },
"redeem_invite":
{ Args: { "p_token_hash": string }; Returns: Json
                           },
"remove_workspace_member":
{ Args: { "p_user_id": string,"p_workspace_id": string }; Returns: undefined
                           },
"revoke_invite":
{ Args: { "p_invite_id": string }; Returns: boolean
                           },
"save_checkin":
{ Args: { "p_accomplishment": string,"p_challenge_id": string,"p_next_plan": string,"p_notes"?: string }; Returns: Json
                           },
"transfer_workspace_ownership":
{ Args: { "p_new_owner_id": string,"p_workspace_id": string }; Returns: undefined
                           },
"update_assigned_task_status":
{ Args: { "p_status": Database["public"]['Enums']["task_status"],"p_task_id": string }; Returns: boolean
                           }
          }
          Enums: {
            "goal_status": "active"|"completed","task_status": "todo"|"in_progress"|"completed","workspace_role": "owner"|"member"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "goal_status": ["active", "completed"],"task_status": ["todo", "in_progress", "completed"],"workspace_role": ["owner", "member"]
          }
        }
} as const
