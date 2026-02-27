export interface AiChatLog {
    id: number;
    user_query: string;
    prompt_used: string;
    sql_generated: string;
    sql_execution_result: string;
    ai_reasoning: string;
    final_answer: string;
    created_at: string;
}
