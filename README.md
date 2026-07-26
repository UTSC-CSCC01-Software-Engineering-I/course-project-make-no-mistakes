## Table of Contents

1. [Product Information](#product-information)
2. [Team Information](#team-information)
3. [Design Documents](#design-documents)

## Product Information

Product name: CRMP

Product summary:

Screenshot of Main Screen (Browsing Page):
![homescreen-image](images/homepageV3.png)

## Team Information

Team Name: Make No Mistakes

Member Names:

- Amelie Breton, amelie.breton@mail.utoronto.ca
- Le Xu, lemon.xu@mail.utoronto.ca
- Xin Chen, phoebechen.chen@mail.utoronto.ca
- Andy Yang, a.yang@mail.utoronto.ca
- Vincent Lam, vin.lam@mail.utoronto.ca

## Design Documents

Project Proposal:
https://docs.google.com/document/d/15cw1lSDrG1fyzA78g8930l5ecIyO_Wq_aeLcFtWy7Vc

Class Diagram:

## Demo Feedback

### Demo 1: 06/23/2026
"UI needs improvements; basic colors, navbar UX; it is out of order"
- To improve on this feedback, the navigation bar has been rearranged, and colors are used to indicate the current screen.

### Demo 2: 07/07/2026
"Great job! The core functionality works well, and the app shows solid progress overall."

## (For Reference) Informal Set Up Guide:
If you will be viewing the project using Docker, make sure that you have it installed before starting:

### With VS Code and Docker: (Inside a folder for this project)
- To clone:
```bash
git clone https://github.com/UTSC-CSCC01-Software-Engineering-I/course-project-make-no-mistakes
```
- From there, you may use Docker for a fresh rebuild:
```bash
docker compose build --no-cache
docker compose up
```
- If you want to start without rebuilding, you just need to do:
```bash
docker compose up
```
- After this, it's possible to access the project using the link: http://localhost:5173/
- To check test cases, navigate to the client or server folder, and do:
```bash
pnpm test
```
- This would run all tests for that side
