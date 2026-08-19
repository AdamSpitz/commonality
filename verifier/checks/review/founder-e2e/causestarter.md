# Causestarter UI

## Root page

### If not logged in: landing page

I dunno, I guess there should be some "hey, here's what this website is all about, here's how to get started" stuff.

There specifically is NOT any "here's the top ten causes" or a list of sitewide recent activity or whatever. We're not listing or promoting causes; CauseStarter hosts this UI for viewing any of the causes, but you have to explicitly have a link to it in order to get to it, you can't just browse.

### If logged in: home page

The main things you can do on the CauseStarter home page: causes, statements, projects, suggesters.

  - Causes:
    - Create a new cause.
    - View causes you've already bookmarked.
    - View causes you've begun drafting but haven't published yet.
  - Statements:
    - View bookmarked statements (this should probably just be a link to a separate page; we shouldn't clutter up the home page with the full list, it can be long)
  - Projects:
    - View projects you've bookmarked, or created, or contributed to.
  - Suggesters:
    - View suggesters you've subscribed to
    - View suggestions from those suggesters

## Cause editor

This is where you get to if you click Start Cause, or click on a draft you've begun, or click Edit on a cause you own.

There's some sort of interface (where maybe you're interacting with an AI service that's helping you) to create a list of statements and write a title and description, maybe also you can set up a bridge creator to try to bridge to other kinds of people who don't necessarily agree with you...

And then you publish and tada you have a link to your new cause (which if you want to publicize you can then spread around on social media, but that's up to you, we don't do that for you).

## Cause page

For viewing a particular cause.

  - Basic info: description and whatever.
  - Pledges: how much has been pledged in total, how much have you pledged, button to pledge some money (contribute $X or pledge $Y/month, earmarked for a particular statement; optionally you can delegate the funding decisions to someone you know and trust, or to someone who's declared that he's willing to be a delegate). You can click to go to a more-detailed Contributing page.
  - Statements:
    - Shows numbers of signers. There's a Sign (or Retract) button for each.
    - You can select or deselect some; the numbers change accordingly, and so does the Fundable Projects list below.
  - Fundable Projects: You can see a bunch of projects (including content-funding projects) that need money. There's a Create Project button if you want to start one yourself (aligned with a particular statement).
  - Bridges: If the cause has any bridges attached to it, you can sign up to receive nudges from the mediator.

## Contributing page

  - One-time contribution or recurring pledge.
  - Optionally choose the person you're delegating to. (Or you can retain direct control yourself.)
  - Choose the statement that this is earmarked for. (The site should make it clear that this isn't binding, but it *is* public. If the delegate directs the money to something else, the system won't stop him, but it'll all be public info.)

## Fundable Projects page

There are a couple of variations of this page: one for for a single statement, one for a whole cause (i.e. multiple statements).

  - There's a "start project" button.
  - The main purpose of the cause board is to show a bunch of projects aligned with the statements of this cause, and also relevant content-funding contracts (listed as the contract, with “N of M posts attested”, not mixed in as individual posts).
  - Two main tabs or pages or sections or something: not yet funded, not yet reimbursed.
    - Each shows a list of projects; each one has a title, creator, maybe a short description?, partially-green-filled slider showing amount of money already raised and amount of money needed. If it's an assurance contract, it also shows the deadline.
  - Somewhere less prominent there should be two more tabs/pages: fully reimbursed, and failed.

## Project page

  - Shows description, funding threshold, deadline, who's contributed, not sure what else.
  - Lets you contribute.

(I'll fill in more details about more of those features later.)
