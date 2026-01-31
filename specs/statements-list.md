# Saved statements list

We've got a smart contract called MutableRefUpdater, which we're going to use to let each user store a mutable ref whose value is the IPFS CID of some JSON containing a list of statement CIDs that he wants to hold on to.

The motivation is I'm thinking specifically of the workflow where a user uses the UI to create a statement that he doesn't want to sign himself (which is a perfectly reasonable thing to do - it should be totally fine for a user to create statements that he doesn't personally believe). He creates the statement, and then maybe he wants to do something else with the statement, like reference it somewhere else... except how does he even find the statement again?

I mean, maybe the Create Statement workflow ends with the browser pointing at the statement's page. But if he closes that page and then comes back to the UI later, expecting to be able to find the statement he created... it just won't be there. It won't show up on the Statements I've Signed page.

So the idea is to have some sort of list of "here's the statements this user has created/saved", kept in a mutable ref onchain.
