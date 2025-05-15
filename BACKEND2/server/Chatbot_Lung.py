import pandas as pd
from langgraph.graph import StateGraph, END
from typing import TypedDict

# Load your lung cancer dataset
df = pd.read_csv("lung_cancer_home_cure.csv")  # adjust path if needed

# Define schema
class ChatState(TypedDict):
    input: str
    response: str

# Response generator function
def retrieve_info(column: str) -> str:
    if column not in df.columns:
        return f"'{column}' is not a valid category. Available categories: {', '.join(df.columns)}"
    
    values = df[column].dropna().unique()
    values_list = "\n- ".join(map(str, values))
    return f"**{column} Options:**\n\n- {values_list}"

# User input handler function
def handle_user_input(state: ChatState) -> ChatState:
    user_input = state['input'].strip().title()
    response = retrieve_info(user_input)
    return {"input": user_input, "response": response}

# Build LangGraph
builder = StateGraph(ChatState)
builder.add_node("QueryHandler", handle_user_input)
builder.set_entry_point("QueryHandler")
builder.add_edge("QueryHandler", END)

# Compile the graph
graphl = builder.compile()
