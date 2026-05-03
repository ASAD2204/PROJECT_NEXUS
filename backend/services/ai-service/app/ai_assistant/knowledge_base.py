"""
Knowledge Base — FAQs, Study Resources, and Learning Recommendations.

This module provides:
1. Built-in university FAQ answers (for instant responses without LLM)
2. Study resource recommendations (videos, websites, tips) by topic
3. Weak-subject advisor (personalised improvement plans)
"""

from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# University FAQs — instant answers for common questions
# ---------------------------------------------------------------------------

UNIVERSITY_FAQ: dict[str, str] = {
    "admission": (
        "**Admission Process:**\n"
        "1. Apply online at the university portal\n"
        "2. Submit required documents (transcripts, CNIC, photos)\n"
        "3. Appear for the entry test (if applicable)\n"
        "4. Wait for merit list announcement\n"
        "5. Pay the admission fee within the deadline\n"
        "Contact the Admissions Office for specific program requirements."
    ),
    "fee structure": (
        "**Fee Structure:**\n"
        "Fee varies by program. Common components:\n"
        "- Tuition Fee (per credit hour)\n"
        "- Lab Fee (for lab-based courses)\n"
        "- Transport Fee (optional)\n"
        "- Library & Sports Fee\n"
        "Check your fee invoice in the Finance section or ask: *'show my pending fees'*"
    ),
    "grading policy": (
        "**Grading Policy:**\n"
        "| Grade | Points | Range |\n"
        "|-------|--------|-------|\n"
        "| A+    | 4.00   | 90-100 |\n"
        "| A     | 4.00   | 85-89  |\n"
        "| A-    | 3.67   | 80-84  |\n"
        "| B+    | 3.33   | 75-79  |\n"
        "| B     | 3.00   | 70-74  |\n"
        "| B-    | 2.67   | 65-69  |\n"
        "| C+    | 2.33   | 60-64  |\n"
        "| C     | 2.00   | 55-59  |\n"
        "| D     | 1.00   | 50-54  |\n"
        "| F     | 0.00   | < 50   |"
    ),
    "attendance policy": (
        "**Attendance Policy:**\n"
        "- Minimum 75% attendance is required to sit for final exams\n"
        "- Below 75%: You will be marked as 'Short Attendance' and may be debarred\n"
        "- Medical leave requires a doctor's certificate submitted within 3 days\n"
        "- Check your attendance anytime by asking: *'show my attendance'*"
    ),
    "drop course": (
        "**Course Drop / Withdrawal:**\n"
        "- Course can be dropped within the first 2 weeks (no record)\n"
        "- Withdrawal (W grade) allowed until week 10\n"
        "- After week 10: F grade if not completed\n"
        "- Apply through the SIS portal under 'Enrollment' section"
    ),
    "scholarship": (
        "**Scholarships:**\n"
        "- Merit Scholarship: CGPA ≥ 3.5 (50% tuition waiver)\n"
        "- Need-Based Scholarship: Apply with income certificate\n"
        "- Sports Scholarship: For national-level athletes\n"
        "- Contact the Financial Aid Office for details"
    ),
    "library": (
        "**Library Information:**\n"
        "- Hours: Mon-Fri 8:00 AM - 8:00 PM, Sat 9:00 AM - 2:00 PM\n"
        "- Max books per student: 3 at a time\n"
        "- Return period: 14 days\n"
        "- Late fine: PKR 20/day\n"
        "- Digital library access via the Library section in Nexus"
    ),
    "exam": (
        "**Exam Information:**\n"
        "- Midterms: Week 8 (30% weightage)\n"
        "- Finals: Week 16 (50% weightage)\n"
        "- Quiz & Assignments: 20% weightage\n"
        "- Exam schedule is posted 2 weeks before exams\n"
        "- Supplementary exam fee: PKR 5,000 per subject"
    ),
}


def get_faq_answer(query: str) -> Optional[str]:
    """Check if the query matches a built-in FAQ."""
    q = query.lower()
    for key, answer in UNIVERSITY_FAQ.items():
        if key in q:
            return answer
    return None


# ---------------------------------------------------------------------------
# Study Resource Recommendations
# ---------------------------------------------------------------------------

STUDY_RESOURCES: dict[str, dict] = {
    "data structures": {
        "description": "Data Structures & Algorithms",
        "videos": [
            "📺 [Abdul Bari — DS Playlist](https://www.youtube.com/playlist?list=PLDN4rrl48XKpZkf03iYFl-O29szjTrs_O)",
            "📺 [mycodeschool — DS](https://www.youtube.com/playlist?list=PL2_aWCzGMAwI3W_JlcBbtYTwiQSsOTa6P)",
            "📺 [CS Dojo — Data Structures](https://www.youtube.com/playlist?list=PLBZBJbE_rGRV8D7XZ08LK6z-4zPoWzu5H)",
            "📺 [NeetCode — Roadmap](https://neetcode.io/roadmap)",
        ],
        "websites": [
            "🌐 [Visualgo — Visual DS](https://visualgo.net/)",
            "🌐 [GeeksForGeeks — DS](https://www.geeksforgeeks.org/data-structures/)",
            "🌐 [LeetCode — Practice](https://leetcode.com/)",
            "🌐 [HackerRank — DS Track](https://www.hackerrank.com/domains/data-structures)",
        ],
        "tips": [
            "💡 Start with Arrays & Linked Lists, then Trees, Graphs",
            "💡 Practice 2-3 problems daily on LeetCode",
            "💡 Understand the WHY — when to use which structure",
            "💡 Draw diagrams for every operation (insert, delete, search)",
        ],
    },
    "algorithms": {
        "description": "Algorithm Design & Analysis",
        "videos": [
            "📺 [Abdul Bari — Algorithms](https://www.youtube.com/playlist?list=PLDN4rrl48XKpZkf03iYFl-O29szjTrs_O)",
            "📺 [MIT OCW — Introduction to Algorithms](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/)",
        ],
        "websites": [
            "🌐 [CP-Algorithms](https://cp-algorithms.com/)",
            "🌐 [Algorithm Visualizer](https://algorithm-visualizer.org/)",
        ],
        "tips": [
            "💡 Master Big-O notation first",
            "💡 Learn sorting algorithms by heart (Merge, Quick, Heap)",
            "💡 Practice dynamic programming patterns",
        ],
    },
    "database": {
        "description": "Database Management Systems",
        "videos": [
            "📺 [Gate Smashers — DBMS](https://www.youtube.com/playlist?list=PLxCzCOWd7aiFAN6I8CuViBuCdJgiOkT2Y)",
            "📺 [CMU Database Course](https://www.youtube.com/playlist?list=PLSE8ODhjZXjbj8BMuIrRcacnQh20hmY9g)",
        ],
        "websites": [
            "🌐 [SQLZoo — Interactive SQL](https://sqlzoo.net/)",
            "🌐 [W3Schools SQL](https://www.w3schools.com/sql/)",
            "🌐 [DB Fiddle](https://www.db-fiddle.com/)",
        ],
        "tips": [
            "💡 Start with ER diagrams and normalization",
            "💡 Practice SQL queries daily on SQLZoo",
            "💡 Understand ACID properties and transactions",
        ],
    },
    "oop": {
        "description": "Object-Oriented Programming",
        "videos": [
            "📺 [Caleb Curry — OOP Concepts](https://www.youtube.com/watch?v=pTB0EiLXUC8)",
            "📺 [Programming with Mosh — OOP](https://www.youtube.com/watch?v=pTB0EiLXUC8)",
        ],
        "websites": [
            "🌐 [Refactoring Guru — Design Patterns](https://refactoring.guru/design-patterns)",
            "🌐 [OOP Concepts Tutorial](https://www.javatpoint.com/java-oops-concepts)",
        ],
        "tips": [
            "💡 Master the 4 pillars: Encapsulation, Inheritance, Polymorphism, Abstraction",
            "💡 Build small projects (Library System, ATM, etc.)",
            "💡 Learn SOLID principles once basics are clear",
        ],
    },
    "python": {
        "description": "Python Programming",
        "videos": [
            "📺 [Corey Schafer — Python](https://www.youtube.com/playlist?list=PL-osiE80TeTt2d9bfVyTiXJA-UTHn6WwU)",
            "📺 [Tech With Tim — Python](https://www.youtube.com/c/TechWithTim)",
            "📺 [CS50 Python](https://cs50.harvard.edu/python/)",
        ],
        "websites": [
            "🌐 [Real Python](https://realpython.com/)",
            "🌐 [Python Official Docs](https://docs.python.org/3/)",
            "🌐 [Automate the Boring Stuff](https://automatetheboringstuff.com/)",
        ],
        "tips": [
            "💡 Practice daily — even 30 min helps",
            "💡 Build projects: calculator, to-do app, web scraper",
            "💡 Learn list comprehensions and generators early",
        ],
    },
    "web development": {
        "description": "Web Development (Frontend + Backend)",
        "videos": [
            "📺 [Traversy Media — Web Dev Crash Course](https://www.youtube.com/c/TraversyMedia)",
            "📺 [The Net Ninja — Full Stack](https://www.youtube.com/c/TheNetNinja)",
            "📺 [freeCodeCamp — Full Stack](https://www.youtube.com/c/Freecodecamp)",
        ],
        "websites": [
            "🌐 [MDN Web Docs](https://developer.mozilla.org/)",
            "🌐 [freeCodeCamp](https://www.freecodecamp.org/)",
            "🌐 [Frontend Mentor — Practice](https://www.frontendmentor.io/)",
        ],
        "tips": [
            "💡 Learn HTML/CSS → JavaScript → React/Vue → Node.js",
            "💡 Build a portfolio website as your first project",
            "💡 Learn Git/GitHub for version control",
        ],
    },
    "machine learning": {
        "description": "Machine Learning & AI",
        "videos": [
            "📺 [Andrew Ng — ML Course (Stanford)](https://www.coursera.org/learn/machine-learning)",
            "📺 [StatQuest — ML Concepts](https://www.youtube.com/c/joshstarmer)",
            "📺 [Sentdex — Practical ML](https://www.youtube.com/c/sentdex)",
        ],
        "websites": [
            "🌐 [Kaggle — Practice + Datasets](https://www.kaggle.com/)",
            "🌐 [fast.ai — Practical Deep Learning](https://www.fast.ai/)",
            "🌐 [Papers With Code](https://paperswithcode.com/)",
        ],
        "tips": [
            "💡 Start with Linear Regression, Logistic Regression, Decision Trees",
            "💡 Learn NumPy, Pandas, Scikit-learn before deep learning",
            "💡 Do Kaggle competitions for real-world practice",
        ],
    },
    "operating systems": {
        "description": "Operating Systems",
        "videos": [
            "📺 [Gate Smashers — OS](https://www.youtube.com/playlist?list=PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p)",
            "📺 [Neso Academy — OS](https://www.youtube.com/playlist?list=PLBlnK6fEyqRiVhbXDGLXDk_OQAdc0cPiS)",
        ],
        "websites": [
            "🌐 [OS Dev Wiki](https://wiki.osdev.org/)",
            "🌐 [GeeksForGeeks — OS](https://www.geeksforgeeks.org/operating-systems/)",
        ],
        "tips": [
            "💡 Focus on Process Scheduling, Memory Management, Deadlocks",
            "💡 Practice numerical problems for scheduling algorithms",
            "💡 Use diagrams for page replacement algorithms",
        ],
    },
    "networking": {
        "description": "Computer Networks",
        "videos": [
            "📺 [Gate Smashers — CN](https://www.youtube.com/playlist?list=PLxCzCOWd7aiGFBD2-2joCpWOLUrDLvVV_)",
            "📺 [PowerCert — Networking](https://www.youtube.com/c/PowerCertAnimatedVideos)",
        ],
        "websites": [
            "🌐 [Cisco Networking Academy](https://www.netacad.com/)",
            "🌐 [Computer Networking: A Top-Down Approach (Kurose&Ross)](https://gaia.cs.umass.edu/kurose_ross/)",
        ],
        "tips": [
            "💡 Start with OSI Model and TCP/IP stack",
            "💡 Practice subnetting calculations",
            "💡 Use Wireshark to capture and analyze packets",
        ],
    },
    "math": {
        "description": "Mathematics (Calculus, Linear Algebra, Discrete Math)",
        "videos": [
            "📺 [3Blue1Brown — Essence of Linear Algebra](https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab)",
            "📺 [Khan Academy — Calculus](https://www.khanacademy.org/math/calculus-1)",
            "📺 [TrevTutor — Discrete Math](https://www.youtube.com/c/Trevtutor)",
        ],
        "websites": [
            "🌐 [Khan Academy](https://www.khanacademy.org/math)",
            "🌐 [Brilliant.org](https://brilliant.org/)",
            "🌐 [Wolfram Alpha](https://www.wolframalpha.com/)",
        ],
        "tips": [
            "💡 Practice problems daily — math is a skill, not memorization",
            "💡 Understand proofs conceptually, not just mechanically",
            "💡 Use graphing tools to visualize functions",
        ],
    },
}

# Aliases for topic matching
TOPIC_ALIASES: dict[str, str] = {
    "dsa": "data structures",
    "ds": "data structures",
    "linked list": "data structures",
    "tree": "data structures",
    "graph": "data structures",
    "stack": "data structures",
    "queue": "data structures",
    "heap": "data structures",
    "hash": "data structures",
    "sorting": "algorithms",
    "dynamic programming": "algorithms",
    "dp": "algorithms",
    "greedy": "algorithms",
    "bfs": "algorithms",
    "dfs": "algorithms",
    "sql": "database",
    "dbms": "database",
    "nosql": "database",
    "mongodb": "database",
    "postgres": "database",
    "inheritance": "oop",
    "polymorphism": "oop",
    "encapsulation": "oop",
    "abstraction": "oop",
    "design pattern": "oop",
    "html": "web development",
    "css": "web development",
    "javascript": "web development",
    "react": "web development",
    "node": "web development",
    "api": "web development",
    "rest": "web development",
    "ml": "machine learning",
    "ai": "machine learning",
    "deep learning": "machine learning",
    "neural network": "machine learning",
    "nlp": "machine learning",
    "computer vision": "machine learning",
    "tensorflow": "machine learning",
    "pytorch": "machine learning",
    "scikit": "machine learning",
    "process": "operating systems",
    "thread": "operating systems",
    "deadlock": "operating systems",
    "scheduling": "operating systems",
    "memory management": "operating systems",
    "paging": "operating systems",
    "tcp": "networking",
    "udp": "networking",
    "ip": "networking",
    "subnet": "networking",
    "osi": "networking",
    "dns": "networking",
    "http": "networking",
    "protocol": "networking",
    "calculus": "math",
    "linear algebra": "math",
    "discrete math": "math",
    "probability": "math",
    "statistics": "math",
    "matrix": "math",
}


def find_study_topic(query: str) -> Optional[str]:
    """Find the matching study topic from the query."""
    q = query.lower()

    # Direct match
    for topic in STUDY_RESOURCES:
        if topic in q:
            return topic

    # Alias match
    for alias, topic in TOPIC_ALIASES.items():
        if alias in q:
            return topic

    return None


def get_study_resources(query: str) -> str:
    """Return formatted study resources for a detected topic."""
    topic = find_study_topic(query)
    if not topic or topic not in STUDY_RESOURCES:
        return ""

    res = STUDY_RESOURCES[topic]
    parts = [f"**📚 Study Resources for {res['description']}:**\n"]

    if res.get("videos"):
        parts.append("**Video Tutorials:**")
        parts.extend(res["videos"])
        parts.append("")

    if res.get("websites"):
        parts.append("**Websites & Practice:**")
        parts.extend(res["websites"])
        parts.append("")

    if res.get("tips"):
        parts.append("**Pro Tips:**")
        parts.extend(res["tips"])

    return "\n".join(parts)


def get_weak_subject_advice(subject: str) -> str:
    """Generate personalized improvement advice for a weak subject."""
    topic = None

    # Check direct match
    s = subject.lower()
    for t in STUDY_RESOURCES:
        if t in s:
            topic = t
            break
    if not topic:
        for alias, t in TOPIC_ALIASES.items():
            if alias in s:
                topic = t
                break

    if not topic:
        return (
            f"I don't have specific resources for '{subject}' yet, but here's general advice:\n"
            "1. Watch YouTube tutorials — search for the topic + 'full course'\n"
            "2. Practice on platforms like GeeksForGeeks, LeetCode, or Khan Academy\n"
            "3. Form a study group with classmates\n"
            "4. Visit your professor during office hours\n"
            "5. Don't skip the basics — rebuild your foundation first"
        )

    res = STUDY_RESOURCES[topic]
    advice = [
        f"**🎯 Improvement Plan for {res['description']}:**\n",
        "**Step 1: Diagnose** — Identify which specific concepts you struggle with\n",
        "**Step 2: Watch & Learn:**",
    ]
    if res.get("videos"):
        advice.extend(res["videos"][:2])
    advice.append("\n**Step 3: Practice:**")
    if res.get("websites"):
        advice.extend(res["websites"][:2])
    advice.append("\n**Step 4: Apply:**")
    if res.get("tips"):
        advice.extend(res["tips"][:2])
    advice.append(
        "\n**Step 5: Test Yourself** — Take quizzes, ask me to generate practice questions!\n"
        "Remember: consistency beats intensity. 30 minutes daily > 5 hours on weekends."
    )
    return "\n".join(advice)
