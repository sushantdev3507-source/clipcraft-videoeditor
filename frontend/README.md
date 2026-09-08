# ClipCraft Hub

CLIPCRAFT — COMPLETE FRONTEND INTEGRATION + NEXT.JS CONVERSION

🚨 READ THIS ENTIRE INSTRUCTION BEFORE MODIFYING ANY FILE

You are helping us integrate the complete frontend work of our team into ONE final application for our project ClipCraft.

ClipCraft is a web-based video editing application.

We are a frontend team working under a very strict deadline.

We have approximately 4 hours remaining before submission, so the priority is:

INTEGRATE EVERYTHING CORRECTLY → CONVERT TO NEXT.JS → PRESERVE FUNCTIONALITY → MAKE THE PROJECT RUNNING

Do NOT spend the available time on unnecessary redesigns, advanced refactoring, or cosmetic improvements.

1. IMPORTANT TEAM STRUCTURE

Our frontend team has 4 members:

Rupesh

Nutan

Rushikesh

Aditi

However, because of how the work was distributed, the final integration source contains 6 folders/projects.

This is because:

Rupesh has one work folder

Nutan has one work folder

Rushikesh has one work folder

Aditi has TWO separate work folders because she completed TWO different tasks

There is also ONE BASE folder containing the common/shared project structure

Therefore, the uploaded ZIP contains:

6 folders/projects total

Do NOT assume there are only 4 feature folders.

2. IMPORTANT UPLOADED ZIP STRUCTURE

I will provide ONE ZIP file because of upload limitations.

That ZIP contains all the required project folders.

The structure is conceptually:

CLIPCRAFT_ALL_FRONTEND_WORK.zip

CLIPCRAFT_ALL_FRONTEND_WORK/
│
├── BASE/
│
├── RUPESH/
│
├── NUTAN/
│
├── RUSHIKESH/
│
├── ADITI_AUTHENTICATION/
│
└── ADITI_OTHER_TASK/


The actual folder names may differ slightly.

DO NOT depend only on the folder names.

First inspect the contents of every folder.

3. MOST IMPORTANT RULE — DO NOT TREAT ALL FOLDERS THE SAME

The folders have different purposes.

BASE folder

The BASE folder is the common/shared application foundation.

It contains the initial common structure that was shared with team members.

It includes things such as:

Basic Home screen

Navigation

Common application structure

Shared UI

Existing project setup

This BASE folder should be treated as the:

FOUNDATION / SOURCE OF TRUTH FOR THE OVERALL APPLICATION

RUPESH folder

This contains Rupesh's completed frontend work.

Treat this as:

RUPESH'S FEATURE IMPLEMENTATION

Do not assume its folder structure is identical to BASE.

Inspect it first and identify:

What feature he implemented

Which files belong to that feature

Which CSS belongs to it

Which JavaScript belongs to it

Which assets belong to it

Which pages/components belong to it

Then integrate the functionality into the BASE application.

NUTAN folder

This contains Nutan's completed frontend work.

Treat this as:

NUTAN'S FEATURE IMPLEMENTATION

Do not assume it follows the same folder structure as BASE.

Inspect it carefully.

Identify:

Pages

Components

HTML

CSS

JavaScript

Assets

Video-related logic

Editing-related logic

State/interaction logic

Any other completed functionality

Then integrate it into the BASE application.

RUSHIKESH folder

This contains Rushikesh's completed frontend work.

Treat this as:

RUSHIKESH'S FEATURE IMPLEMENTATION

Inspect the entire folder before modifying anything.

Identify all completed functionality and integrate it into the BASE application.

ADITI_AUTHENTICATION folder

This contains Aditi's AUTHENTICATION work.

IMPORTANT:

Aditi's authentication work was completed in an OLDER SHARED FOLDER.

Therefore, this folder may have a different structure from the current BASE folder.

DO NOT assume that it is compatible simply because it came from the same project.

Inspect it carefully.

Identify:

Login

Signup

Authentication UI

Form validation

Authentication-related JavaScript

Authentication-related CSS

Any routing

Any local state

Any authentication-related assets

Any dependencies

Any API/backend assumptions

Then integrate the authentication functionality into the current BASE application.

ADITI_OTHER_TASK folder

This contains Aditi's SECOND / OTHER TASK.

IMPORTANT:

Aditi completed this second task in a NEWER SHARED FOLDER, which is different from the older shared folder where her authentication work was completed.

Therefore:

ADITI_AUTHENTICATION and ADITI_OTHER_TASK are two different development sources.

Do not merge them blindly.

Inspect both separately.

Then combine their functionality into the final application.

4. DO NOT ASSUME ALL FOLDERS ARE NEXT.JS

Some team members worked using:

HTML

CSS

JavaScript

because the team was not originally familiar with Next.js.

Our mentor has now instructed us to convert the completed work into:

Next.js + React

Therefore, the final application MUST be a proper Next.js application.

Do not simply place the old HTML files inside the Next.js project.

Do not simply copy old JavaScript files and expect them to work.

Convert the implementations appropriately.

5. FIRST STEP — INSPECT EVERYTHING

Before making major changes:

Inspect ALL six folders.

Do not start by copying files immediately.

For each folder determine:

What is this folder?

Which person/task does it belong to?

What features are implemented?

What files are important?

Is it HTML/CSS/JS?

Is it already React?

Is it already Next.js?

What assets exist?

What dependencies exist?

What routes exist?

What JavaScript behavior exists?

What components exist?

What CSS exists?

Are there duplicate files?

Are there conflicting versions?

Are there duplicate Home pages?

Are there duplicate navigation systems?

Only after understanding the folders should you perform the integration.

6. BASE PROJECT MUST REMAIN THE FOUNDATION

The BASE project is NOT just another feature folder.

It is the foundation.

Preserve the BASE project's:

Home screen

Main navigation

Existing application shell

Existing layout

Existing routing where valid

Existing styling where valid

Existing components

Existing assets

Do not replace the BASE project with another teammate's folder.

Do not choose a teammate folder as the new base simply because it has more files.

7. DO NOT COPY ENTIRE FOLDERS BLINDLY

This is extremely important.

DO NOT do this:

BASE/
+ RUPESH/
+ NUTAN/
+ RUSHIKESH/
+ ADITI_AUTH/
+ ADITI_OTHER/


by simply overwriting files with the same names.

Instead:

INSPECT → IDENTIFY FEATURE → CONVERT → INTEGRATE

For every teammate folder:

Understand the feature

Identify required files

Convert the feature to React/Next.js

Place components appropriately

Merge CSS safely

Merge required assets

Connect routes

Connect navigation

Connect shared state where necessary

Test the feature

8. HOME SCREEN RULE

There must be ONLY ONE primary Home screen.

The Home screen from the BASE project should remain the primary Home screen.

If other folders contain:

index.html

home.html

Home.jsx

page.jsx

dashboard-like landing page

DO NOT automatically replace the BASE Home screen.

Instead determine whether the file contains:

Duplicate Home functionality

A feature page

A required section

A different application shell

Preserve only the functionality that is actually required.

9. NAVIGATION RULE

There must be ONLY ONE main application navigation.

The BASE project's navigation should remain the primary navigation.

If another folder contains:

Navbar

Header

Sidebar

Menu

Navigation bar

Navigation links

do NOT create another global navigation system.

Instead:

Inspect the navigation.

Identify any missing routes/features.

Add the required links/actions to the existing BASE navigation.

Preserve the BASE navigation's overall design.

Avoid:

Two navbars

Two sidebars

Two headers

Duplicate Home buttons

Duplicate navigation menus

10. NEXT.JS CONVERSION

Convert HTML to React/Next.js.

For example:

Old HTML:

<div class="editor-container">
    <button id="crop-button">Crop</button>
</div>


must become appropriate JSX:

<div className="editor-container">
    <button onClick={handleCrop}>Crop</button>
</div>


Convert appropriately:

class → className

onclick → onClick

onchange → onChange

oninput → onInput

onsubmit → onSubmit

for → htmlFor

Convert DOM manipulation into React patterns.

11. JAVASCRIPT → REACT

Do NOT blindly keep old JavaScript.

Inspect what each JavaScript file does.

Where appropriate convert:

document.getElementById()


to:

useState

useRef

props

component logic

Convert:

addEventListener()


to React event handlers or useEffect where appropriate.

Convert:

querySelector()
querySelectorAll()
innerHTML
style.left
style.top
classList


into React-compatible implementations where practical.

Do not destroy existing behavior while converting.

12. BROWSER APIs

Some ClipCraft features naturally require browser APIs.

Examples:

video

audio

canvas

FileReader

window

document

localStorage

keyboard events

mouse events

drag/drop

media APIs

For components requiring browser APIs, use appropriate Next.js client components.

Use:

"use client";


when necessary.

Do not unnecessarily make the entire application client-side.

13. VIDEO EDITOR INTEGRATION

ClipCraft is a video editing application.

The final project should behave as ONE video editor.

Do not treat each teammate's feature as a completely separate mini-application.

If the existing work contains features such as:

Video upload

Video preview

Text overlay

Text positioning

Crop

Trim

Split

Timeline

Playback

Undo

Redo

Editing controls

Export UI

integrate those features into the appropriate editor/workspace.

Where technically possible, they should operate on the same video/editor state.

Do not create unnecessary duplicate video players.

For example, if:

Nutan's feature works with a video

and

Rupesh's feature also works with the same editor video,

integrate them so they can operate within the same editor rather than creating unrelated separate applications.

14. TEXT OVERLAY

If any provided implementation contains text overlay functionality:

Preserve all existing behavior.

This may include:

Adding text

Editing text

Positioning text

Moving text

Clearing text

Text input

Text appearing over the video

Text state

Do not replace working text functionality with a placeholder.

Convert the implementation into React while preserving behavior.

15. CROP / EDITING FEATURES

If crop functionality exists:

Preserve:

Crop controls

Crop interaction

Crop UI

Existing behavior

Relevant video/canvas interaction

Do not remove it simply because the original implementation uses JavaScript.

Convert the functionality appropriately.

16. UNDO / REDO

If undo/redo functionality exists in any teammate implementation:

Preserve it.

Do not implement a completely unrelated undo/redo system unless required.

Make sure undo/redo does not unnecessarily break:

Text position

Text content

Video state

Crop state

Other existing editor states

Preserve the behavior that already exists.

17. AUTHENTICATION INTEGRATION

Aditi's authentication work is especially important because it came from an OLDER shared folder.

Do not simply copy the entire old application.

Extract the authentication feature.

Identify:

Login page

Signup page

Authentication UI

Form fields

Validation

Error states

Authentication logic

Routing

Required dependencies

API calls

Backend assumptions

Then integrate authentication into the CURRENT BASE project.

The current BASE project's:

Home

Navigation

Application structure

must remain intact.

If authentication requires new routes, add them cleanly.

For example, if appropriate:

/login
/signup


But only create routes that actually correspond to the existing authentication implementation.

18. IMPORTANT BACKEND RULE

Do NOT invent backend functionality.

If authentication or another feature expects a backend/API that is not included in the provided frontend files:

keep the frontend integration intact and clearly identify the backend dependency.

Do not create fake authentication or fake API responses just to make the UI appear functional unless the original project already used mock/demo behavior.

Do not invent API endpoints.

19. ADITI'S TWO PROJECTS MUST BOTH BE PRESERVED

This is a critical requirement.

Aditi has TWO separate folders:

Aditi Authentication

Older shared project.

Aditi Other Task

Newer shared project.

They may contain:

Different versions

Different file structures

Different CSS

Different components

Different dependencies

Different assumptions

Do NOT assume one should overwrite the other.

Inspect both.

Merge the useful functionality from BOTH.

If the same file exists in both:

do NOT automatically choose one.

Determine which implementation contains the correct/current functionality.

Preserve both required features.

20. CSS INTEGRATION

Every project may have its own CSS.

Do not blindly overwrite CSS.

Look for:

Same class names

Generic selectors

Global styles

Body styles

Button styles

Container styles

Header styles

Sidebar styles

Avoid conflicts.

Prefer scoped component styling or appropriately organized CSS where practical.

Preserve the visual appearance of the existing features.

Do not redesign everything.

21. ASSET INTEGRATION

Inspect all assets from all folders.

This includes:

PNG

JPG/JPEG

SVG

Icons

Logos

Fonts

Video assets

Other static resources

Do not blindly duplicate identical assets.

Move/copy required assets into the appropriate Next.js static/public structure.

Fix broken paths.

For example, old paths such as:

../assets/image.png


may need to be changed to the appropriate Next.js path.

Verify that images and assets actually load.

22. PACKAGE.JSON / DEPENDENCIES

Inspect package.json files from all relevant folders.

Identify dependencies required by the completed features.

Merge only necessary dependencies into the final project.

Avoid:

Duplicate dependencies

Unnecessary libraries

Conflicting versions

Installing packages that are not required

Do not replace the whole package.json blindly.

23. ROUTING

Use the routing system already present in the BASE Next.js project if one exists.

Create routes only when required.

Possible routes could include:

/
/login
/signup
/editor
/workspace


But do NOT automatically create these routes.

Determine the actual routes required by the provided work.

The final navigation must correctly connect to the integrated pages/features.

24. COMPONENTIZATION

Convert appropriate features into React components.

For example:

components/
├── Navigation
├── Home
├── Editor
├── VideoPlayer
├── Timeline
├── TextTool
├── CropTool
├── Authentication
└── ...


The exact structure should follow the existing BASE project when possible.

Do not perform a massive folder restructure unless necessary.

25. SHARED STATE

If multiple features need to communicate, integrate their state appropriately.

Prefer simple React tools:

useState

useRef

useEffect

props

Context when necessary

Do not introduce Redux or another large state-management system unless genuinely required.

For example:

If video upload creates the active video,

the editor tools should be able to access the appropriate video/editor state.

Avoid creating several disconnected copies of the same state.

26. DO NOT LOSE ANY TEAM MEMBER'S WORK

This is one of the most important instructions.

Every feature from:

RUPESH

NUTAN

RUSHIKESH

ADITI AUTHENTICATION

ADITI OTHER TASK

must be inspected and accounted for.

Do not silently omit a feature because it is difficult to convert.

If something cannot be integrated exactly, preserve as much of its functionality as possible and clearly report what remains.

27. DO NOT REDESIGN

This is an integration task.

DO NOT:

Create a new design

Replace the existing Home screen

Replace the existing navigation

Change the application's identity

Change the project's purpose

Add unrelated features

Add unnecessary animations

Replace existing UI with a completely different UI

Remove working functionality just to simplify the code

Preserve the team's existing work.

28. VISUAL CONSISTENCY

After integration, make the different features feel like ONE application.

You may make small styling adjustments where required to resolve:

CSS conflicts

Spacing conflicts

Navigation conflicts

Component sizing conflicts

Responsive conflicts

But do NOT redesign the features from scratch.

29. RESPONSIVE DESIGN

Preserve existing responsive behavior.

The final application should work reasonably on:

Desktop

Tablet

Mobile

Do not remove responsive CSS from the team implementations.

Fix only conflicts caused by integration.

30. ERROR FIXING

After integration, check for:

Next.js compilation errors

React errors

JSX errors

Import errors

Missing modules

Missing assets

Undefined variables

Undefined functions

Broken event handlers

Broken routes

Hydration errors

Browser API errors

CSS conflicts

Incorrect paths

Duplicate components

Fix errors that prevent the application from working.

31. DO NOT HIDE ERRORS

Do NOT use hacks such as:

Empty catch blocks

Removing functionality

Commenting out broken features

Replacing functionality with static text

Adding fake buttons

Suppressing errors without fixing the cause

If something genuinely depends on an unavailable backend/API:

keep the frontend implementation and document the dependency.

32. TIME PRIORITY

We have approximately 4 hours remaining.

Therefore, use this priority:

PRIORITY 1

Make the application run.

PRIORITY 2

Convert the existing frontend into Next.js/React.

PRIORITY 3

Integrate all team features.

PRIORITY 4

Preserve Home + Navigation.

PRIORITY 5

Fix major UI/CSS conflicts.

PRIORITY 6

Fix responsive issues.

PRIORITY 7

Minor cleanup.

Do NOT spend excessive time on perfect architecture.

A working integrated project is more important than perfectly refactored code.

33. FINAL APPLICATION FLOW

The final application should conceptually behave like:

                    CLIPCRAFT
                        │
                        ▼
                     HOME
                        │
                  MAIN NAVIGATION
                        │
          ┌─────────────┴─────────────┐
          │                           │
      AUTHENTICATION              EDITOR
          │                           │
     Login / Signup                   │
                                      ▼
                              VIDEO WORKSPACE
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
           Video                   Editing                 Tools
           Upload                  Controls                Features
              │                       │                       │
              └───────────────────────┼───────────────────────┘
                                      │
                                      ▼
                              Integrated Editor


This is only a conceptual flow.

Follow the actual features present in the provided folders.

Do NOT invent missing functionality.

34. VERY IMPORTANT — SOURCE PRIORITY

If conflicts occur between folders, use this general priority:

1.

BASE application structure

2.

Current working functionality

3.

Required completed feature

4.

Correct/latest implementation where two versions conflict

5.

Visual consistency

Do NOT automatically let the newest folder overwrite the BASE.

Do NOT automatically let the largest folder win.

Inspect the actual functionality first.

35. KEEP A FEATURE INTEGRATION CHECKLIST

While working, internally track:

[ ] BASE
    [ ] Home
    [ ] Navigation
    [ ] Common structure

[ ] RUPESH
    [ ] Feature identified
    [ ] HTML converted
    [ ] CSS integrated
    [ ] JS converted
    [ ] Assets integrated
    [ ] Route/navigation connected

[ ] NUTAN
    [ ] Feature identified
    [ ] HTML converted
    [ ] CSS integrated
    [ ] JS converted
    [ ] Assets integrated
    [ ] Route/navigation connected

[ ] RUSHIKESH
    [ ] Feature identified
    [ ] HTML converted
    [ ] CSS integrated
    [ ] JS converted
    [ ] Assets integrated
    [ ] Route/navigation connected

[ ] ADITI AUTHENTICATION
    [ ] Login
    [ ] Signup
    [ ] Validation
    [ ] Auth logic
    [ ] Routes
    [ ] CSS
    [ ] Assets
    [ ] Dependencies

[ ] ADITI OTHER TASK
    [ ] Feature identified
    [ ] HTML converted
    [ ] CSS integrated
    [ ] JS converted
    [ ] Assets integrated
    [ ] Route/navigation connected


Do not consider the integration complete until every relevant folder has been inspected.

36. FINAL TEST

Before finishing, verify:

PROJECT

Is the final project a Next.js project?

Does it compile?

Does it start?

BASE

Is the original Home screen preserved?

Is the original navigation preserved?

RUPESH

Is Rupesh's completed functionality present?

NUTAN

Is Nutan's completed functionality present?

RUSHIKESH

Is Rushikesh's completed functionality present?

ADITI AUTH

Is authentication functionality integrated?

ADITI OTHER

Is Aditi's second completed task integrated?

VIDEO EDITOR

Does the editor/workspace load?

Does the relevant video functionality work?

Do editing features remain accessible?

REACT

Has HTML been converted to JSX?

Has JavaScript been converted to React-compatible logic?

Are client components used where necessary?

NAVIGATION

Is there only ONE primary navigation?

Are required routes accessible?

ASSETS

Are assets loading?

CSS

Are there major conflicts?

CONSOLE

Are there obvious runtime errors?

37. DO NOT CLAIM SUCCESS WITHOUT CHECKING

If you can verify something, state that it works.

If you cannot verify something, clearly say:

"This could not be fully verified and should be manually tested."

Do not falsely claim that every feature is working.

38. FINAL SUMMARY REQUIRED

After completing the integration, provide a concise technical summary with:

A. BASE

What was preserved from the BASE project.

B. RUPESH

What was integrated from Rupesh.

C. NUTAN

What was integrated from Nutan.

D. RUSHIKESH

What was integrated from Rushikesh.

E. ADITI AUTHENTICATION

What was integrated from Aditi's authentication project.

F. ADITI OTHER TASK

What was integrated from Aditi's second project.

G. NEXT.JS CONVERSION

What HTML/CSS/JavaScript was converted to React/Next.js.

H. FILES

Important files/components created or modified.

I. DEPENDENCIES

Any dependencies added/changed.

J. REMAINING ISSUES

Anything that still needs manual testing or backend integration.

39. ABSOLUTE FINAL GOAL

The output must be:

ONE INTEGRATED CLIPCRAFT NEXT.JS APPLICATION

It must combine the completed work from:

BASE
+
RUPESH
+
NUTAN
+
RUSHIKESH
+
ADITI AUTHENTICATION
+
ADITI OTHER TASK


into ONE application.

Remember:

BASE = foundation

Other folders = feature sources

Do NOT treat all six folders as independent applications.

Do NOT simply copy everything.

Do NOT overwrite the BASE blindly.

Do NOT create duplicate navigation.

Do NOT replace the BASE Home screen.

Do NOT lose completed features.

Do NOT invent backend functionality.

Do NOT redesign the project.

Do NOT remove functionality just because it was originally written in HTML/CSS/JavaScript.

Instead:

INSPECT → UNDERSTAND → CONVERT → INTEGRATE → CONNECT → FIX → VERIFY

Start by inspecting the complete uploaded ZIP and identifying the purpose and contents of all six folders before performing the integration.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/17cef4dd-f539-4264-8e57-68bac2d244aa).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
