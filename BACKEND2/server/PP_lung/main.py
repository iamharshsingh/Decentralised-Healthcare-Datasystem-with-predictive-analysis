from Chatbot_Lung import graph  # This should refer to the Lung Cancer chatbot logic file

def run_chatbot():
    print("🫁 Welcome to the Lung Cancer Cure Assistant!")
    print("You can ask about: Medicine, Exercise, Doctor(Top Known in INDIA)")
    print("Type 'exit' to quit.\n")

    while True:
        user_input = input("You: ")
        if user_input.strip().lower() == "exit":
            print("👋 Stay healthy. Goodbye!")
            break

        try:
            result = graph.invoke({"input": user_input})

            # Handle the response safely
            response = result.get("response") or result.get("output") or "🤖 Sorry, I couldn't find a proper answer."
            print("Bot:", response)
            print()
        except Exception as e:
            print("🚨 Error from chatbot engine:", str(e))
            print()

if __name__ == "__main__":
    run_chatbot()
