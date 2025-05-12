from Chatbot import graph

def run_chatbot():
    print("❤️ Welcome to the Heart Health Assistant!")
    print("You can ask about: Medicine, Exercise, Diet, Home Remedies, Cardiologist")
    print("Type 'exit' to quit.\n")

    while True:
        user_input = input("You: ")
        if user_input.strip().lower() == "exit":
            print("👋 Stay heart-healthy. Goodbye!")
            break

        try:
            result = graph.invoke({"input": user_input})

            # Safely handle the output dictionary
            response = result.get("response") or result.get("output") or "🤖 Sorry, I couldn't find a proper answer."
            print("Bot:", response)
            print()
        except Exception as e:
            print("🚨 Error from chatbot engine:", str(e))
            print()

if __name__ == "__main__":
    run_chatbot()
