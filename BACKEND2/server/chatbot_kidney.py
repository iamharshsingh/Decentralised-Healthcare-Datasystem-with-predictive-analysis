import pandas as pd
from langgraph.graph import StateGraph, END
from typing import TypedDict

# Load the dataset
df = pd.read_csv("chronic_kidney_disease_home_cure_extended.csv")

# Define the schema for LangGraph state
class ChatState(TypedDict):
    input: str
    response: str

# Generate responses from the dataset
def retrieve_info(column: str) -> str:
    if column not in df.columns:
        return f"❌ '{column}' is not a valid category. Try one of: {', '.join(df.columns)}"
    
    values = df[column].dropna().unique()
    return f"**{column} Suggestions:**\n\n- " + "\n- ".join(values)

# Process user input
def handle_user_input(state: ChatState) -> ChatState:
    user_input = state['input'].strip().title()
    response = retrieve_info(user_input)
    return {"input": user_input, "response": response}

# Build LangGraph
builder = StateGraph(ChatState)
builder.add_node("QueryHandler", handle_user_input)
builder.set_entry_point("QueryHandler")
builder.add_edge("QueryHandler", END)
graphk = builder.compile()
