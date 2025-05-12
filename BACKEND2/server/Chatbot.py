import pandas as pd
from langgraph.graph import StateGraph, END
from typing import TypedDict
import os

# Load your dataset
base_dir = os.path.dirname(__file__)           
data_path = os.path.join(base_dir, "heart_health_data_merged.csv")
df = pd.read_csv(data_path)

# Define schema
class ChatState(TypedDict):
    input: str
    response: str

# Response generator
def retrieve_info(column: str) -> str:
    if column not in df.columns:
        return f"'{column}' is not a valid category. Available: {', '.join(df.columns)}"
    values = df[column].dropna().unique()
    return f"**{column} Options:**\n\n- " + "\n- ".join(values)

# User input handler
def handle_user_input(state: ChatState) -> ChatState:
    user_input = state['input'].strip().title()
    response = retrieve_info(user_input)
    return {"input": user_input, "response": response}

# Build LangGraph
builder = StateGraph(ChatState)
builder.add_node("QueryHandler", handle_user_input)
builder.set_entry_point("QueryHandler")
builder.add_edge("QueryHandler", END)
graphh = builder.compile()
