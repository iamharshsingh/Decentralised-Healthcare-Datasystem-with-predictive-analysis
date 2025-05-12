import pandas as pd
from langgraph.graph import StateGraph, END
from typing import TypedDict
import os

# Load the dataset
base_dir = os.path.dirname(__file__)
dataset_path = os.path.join(base_dir, "diabetes_cure_extended_dataset.csv")
df = pd.read_csv(dataset_path)

# Define the expected structure of state using TypedDict
class ChatState(TypedDict):
    input: str
    response: str

# Function to retrieve information from a specific column
def retrieve_column_info(column: str) -> str:
    if column not in df.columns:
        return f"Sorry, '{column}' is not a valid category. Please choose from: {', '.join(df.columns)}"
    unique_values = df[column].dropna().unique()
    return f"**{column} Options:**\n\n- " + "\n- ".join(unique_values)

# Function that processes user input
def handle_user_input(state: ChatState) -> ChatState:
    user_input = state['input'].strip().title()
    response = retrieve_column_info(user_input)
    return {"input": user_input, "response": response}

# Define LangGraph pipeline with schema
builder = StateGraph(ChatState)
builder.add_node("QueryHandler", handle_user_input)
builder.set_entry_point("QueryHandler")
builder.add_edge("QueryHandler", END)

# Compile the LangGraph
graphd = builder.compile()
