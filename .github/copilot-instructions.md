# GitHub Copilot Custom Instructions

## 🏗️ Architecture: Hexagonal (Ports & Adapters)
Strictly adhere to Hexagonal Architecture principles across the codebase:
* **Domain:** This is the core of the application containing the most important business logic. It must have zero dependencies on external frameworks or systems.
* **Application** This is the application layer logic, it has 2 sub-layers: 
  * **Ports** Define clear interfaces to act as contracts between the Domain and the Adapters.
  * **Services:** This layer contains application services that implement the use cases and coordinate interactions between the Domain and the Adapters.
* **Adapters:** Implement the Ports to handle all interactions with the outside world (e.g., Firefox, databases, external APIs, UI). Keep external implementation details strictly inside the Adapters.

## 🧠 Domain Modeling
* **Rich Domain Models Only:** Domain objects must encapsulate both data and actual behavior/business rules.
* **No Anemic Models:** Do not create simple data containers or structs that only consist of getters and setters.

## Functional Programming Principles
* **Pure Functions:** Whenever possible, write pure functions that do not cause side effects and always return the same output for the same input.
* **Immutability:** Avoid mutating data. Use immutable data structures and patterns to ensure predictability and easier debugging.

## 🤖 Copilot Operational Rules
* **Direct File Manipulation:** Always read from and edit files directly. Do not suggest or run terminal commands to read, modify, or create files.
* **No Unnecessary Markdown:** Do not generate `.md` files to document or explain every single action you take. Keep explanations concise within the chat UI and apply your code changes directly to the relevant project files.