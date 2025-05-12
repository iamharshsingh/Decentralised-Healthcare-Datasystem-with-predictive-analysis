from Chatbot_agent import graph

def run_chatbot():
    print("Welcome to the Diabetes Cure Assistant!")
    print("Type one of the following: Medicine, Exercise, Home Cure, Diet, Doctor Type")
    print("Type 'exit' to quit.\n")

    while True:
        user_input = input("You: ")
        if user_input.lower() == "exit":
            break

        result = graph.invoke({"input": user_input})
        print("Bot:", result["response"])
        print()

if __name__ == "__main__":
    run_chatbot()
