## Table of Contents

1. [Product Information](#product-information)
2. [Team Information](#team-information)
3. [Design Documents](#design-documents)

## Product Information

Product name: CRMP

Product summary:

Screenshot of Main Screen (Browsing Page):

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

## (Delete Later, For Reference) Set Up Guide(?):
Please correct any inaccuracies below:

### With VS Code: (Inside a folder for this project)
- git clone https://github.com/UTSC-CSCC01-Software-Engineering-I/course-project-make-no-mistakes

### (For a new branch)
- git switch -c feature/branchName

- git switch remote/branch (use after fetching, git will automatically create local branch with same name and track the remote branch)

### Checking Frontend Preview (must navigate to 'client/' directory first):
- npm run build
- npm run preview
- npm dev
	* can use this during development; changes to files will automatically refresh frontend

### Running the backend (must navigate to 'server/' directory first):
- npm start
- npm dev
	* can use this during development; changes to files will automatically refresh backend
		* note that if the backend refreshes, the frontend must be restarted (run 'build + preview' or 'dev' again)

NOTE: backend must be started first, in a separate terminal session, before starting the frontend

NOTE: pnpm (aliased by 'pn') can be used in place of npm for the above commands

e.g.
```bash
# Session 1
.../course-project-make-no-mistakes/server> npm dev


# Session 2
.../course-project-make-no-mistakes/client> npm dev
```

### Committing Changes:
- git add .
- git commit -m "message"
- git push

### If it's a new branch, need to do:
- git push -u origin branchName

- git push -u origin HEAD (if pushing the branch that you're currently on, for the first time)
