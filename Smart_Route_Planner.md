# 🚀 Smart Route Planner (AI Navigation System)

## 📌 Project Overview
The Smart Route Planner is an AI-based navigation system that finds the shortest or fastest route between locations. It simulates real-world navigation systems by considering distance, traffic conditions, and user preferences.

---

## 🎯 Objectives
- Find optimal route using algorithms
- Visualize route selection
- Dynamically update routes when traffic changes
- Compare different algorithms

---

## 🧠 Algorithms Used

### 1. Dijkstra’s Algorithm
- Finds shortest path
- Works with weighted graphs
- Guarantees optimal solution

### 2. A* Algorithm
- Uses heuristic function
- Faster than Dijkstra
- Formula:
  f(n) = g(n) + h(n)

### 3. Greedy Technique
- Chooses locally optimal path
- Faster but not always correct

### 4. Binary Search
- Used for efficient searching/sorting operations

---

## 🏗️ System Architecture

User Input → Graph → Algorithm → Optimal Path → Visualization

---

## 🧰 Tech Stack

### Language
- Python

### Libraries
- networkx → Graph handling
- matplotlib → Visualization
- tkinter → GUI
- heapdict → Priority queue

---

## ⚙️ Installation

```bash
pip install networkx matplotlib tkinter heapdict