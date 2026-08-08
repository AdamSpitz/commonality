Quick recap
-----------

The meeting focused on exploring Gitcoin's quadratic funding system and
discussing potential compatibility with their own project, including public
goods and crowdfunding concepts. Sam and Adam discussed the development of a
tool to manage statement relationships and implications, considering various
technical challenges and potential misuse scenarios. They also covered the
technical aspects of building a blockchain application, including indexing tools
and data structure considerations, with plans for further development and
collaboration.

Next steps
----------

-   [Adam: Define the schema for what the indexer will produce (i.e., the tables
    and data structure the indexer will output) and share this schema with
    Sam.](https://us06tasks.zoom.us/?meetingId=pafKVOhtR56uClZi5fqnOw%3D%3D&stepId=320510b0-c71b-11f0-9d06-46ea359d66a2)

-   [Sam: Generate fake data into tables that match the schema provided by Adam,
    and begin mapping these tables into Gremlin/graph format for graph-based
    analysis.](https://us06tasks.zoom.us/?meetingId=pafKVOhtR56uClZi5fqnOw%3D%3D&stepId=320514f1-c71b-11f0-9dfa-46ea359d66a2)

-   [Adam: Consider creating a Docker image containing the local blockchain,
    fake data generator, and indexer, so Sam can easily run and access the APIs
    and
    data.](https://us06tasks.zoom.us/?meetingId=pafKVOhtR56uClZi5fqnOw%3D%3D&stepId=320516f1-c71b-11f0-9fed-46ea359d66a2)

-   [Sam: Add the transcript of this meeting to the GitLab repository under the
    appropriate directory (e.g., specs/chats), and send a pull request to
    Adam.](https://us06tasks.zoom.us/?meetingId=pafKVOhtR56uClZi5fqnOw%3D%3D&stepId=320519e3-c71b-11f0-8338-46ea359d66a2)

Summary
-------

### Exploring Gitcoin's Funding Model

Adam and Sam discussed Gitcoin, a platform that uses quadratic funding for
public goods and open-source projects. They explored the similarities and
potential compatibility between their project and Gitcoin's funding system. Sam
shared resources from Gitcoin and mentioned he had compiled a list of ideas
related to public goods and crowdfunding. They briefly touched on the
left-leaning nature of some crypto projects and the concept of public goods from
an economic perspective.

### Streamlining Smart Contract Systems

Adam expressed frustration with the current approach of others and his desire to
create a simpler system, focusing on smart contracts. Sam discussed potential
challenges, such as flame wars and philosophical debates, and suggested
directing discussions to other platforms. Adam proposed using funding as a way
to cut through philosophizing and suggested avoiding overly complex models for
statement relationships. They also explored the concept of public goods and the
potential for using the system for various purposes, including political
donations.

### Balancing Support and Unintended Consequences

Sam and Adam discussed the implications of statements and their support in
various contexts, including playground safety, local produce, and disaster
response. They explored the balance between perfect solutions and practical,
usable ones, as well as the challenges of managing unintended consequences and
dark uses of well-intentioned ideas. Sam highlighted the importance of
transparency in supporting statements and the potential for aggregation of
support, while also noting the risks of statements being co-opted by larger
projects. They also touched on grassroots movements and the impact of
significant financial backing on such movements.

### Funding Systems and Market Dynamics

Sam and Adam discussed the dynamics of funding systems, particularly in relation
to public goods and the potential for misuse. They explored concepts such as the
"Elon effect," the tragedy of the commons, and the role of insurance contracts
in maintaining system integrity. They also considered the implications of
large-scale coalitions and the potential for distributed denial-of-service
attacks. The conversation touched on the idea of anti-funding, or shorting the
market, as a means to counteract negative influences in funding systems. Adam
emphasized the importance of keeping the system simple and not overcomplicating
it with complex logical structures.

### AI-Driven Statement Coordination Tool

Adam and Sam discussed developing a tool to reduce the need for coordination on
statement definitions by leveraging AI to smooth over differences in how ideas
are expressed. They explored the concept of a marketplace of ideas,
distinguishing it from Gitcoin's focus on project funding, and considered how to
handle complex concepts like free speech. Sam emphasized the importance of
visualizing use cases and coalitions, while Adam suggested simplifying the
system by avoiding transitive implications and directly evaluating relationships
between statements. They also touched on the potential for the system to handle
beliefs and religious statements, acknowledging the challenges involved.

### Spam Prevention System Design

Adam and Sam discussed the structure and functionality of a system involving
statements and implications. They explored ways to prevent spam by implementing
micropayments for each email or transaction, similar to blockchain principles.
They agreed to create a visual representation of the system, including users,
statements, and concepts, with implications between statements and instances of
concepts. Sam encountered some technical difficulties while attempting to modify
the tool for their purposes.

### Graph Model for Concept Relationships

Sam and Adam discussed creating a graph model to represent concepts, statements,
and relationships. They explored how statements can imply each other and share
commonalities, which they represented as bidirectional arrows in the graph. They
also discussed adding a separate section for projects and funding, including
concepts like founders, investors, and donors. The conversation highlighted the
complexity of modeling these concepts in a graph structure and the need to
define relationships between different elements.

### System Bug and Alignment Modeling

Sam and Adam discussed a bug in a system that was causing regressions after
adding new features. They explored different modeling techniques to capture
relationships between projects, statements, and alignments. They agreed to
create an "aligned project list" that would be connected to alignments, allowing
users to view projects aligned with specific statements.

### Graph System Relationship Management Discussion

Sam and Adam discussed the functionality of a graph-based system for managing
relationships between statements, projects, and users. They identified issues
with reusing labels and duplicating entries, which Sam attributed to the "curse
of vibe coding." Sam demonstrated the ability to add multiple donors and
investors to the system, though he encountered some technical difficulties
during the demonstration. They also discussed the concept of a trustee, which
Adam described as an intermediary between investors or donors and funding
decisions, though they did not finalize how to model this in the graph system.

### System User Roles and Account Types

Sam and Adam discussed user roles and account types in a system, focusing on the
distinction between users, trustees, and investors/donors. They agreed that the
user box should be renamed to "Ethereum Account" for clarity. Adam suggested
simplifying the diagram by having all arrows between investors, donors, and
projects go through a trustee. Sam noted that diagrams like this can be useful
for initial understanding but may not be necessary once the concepts are
internalized. They also briefly discussed Sam's approach to using diagrams as a
starting point for coding an architecture.

### Blockchain Smart Contracts Implementation Update

Adam explained his progress on implementing smart contracts and indexing tools
for a blockchain application. He described the process of indexing blockchain
events using tools like Ponder, which watches for relevant transactions and
converts them into a structured database. Adam shared a smart contract example,
showing how events are defined and how the contract interacts with the
blockchain. They discussed the technical details of the contract, including its
ability to handle withdrawals and track project progress.

### Blockchain Indexer Development Discussion

Sam and Adam discussed the development of an indexer for blockchain data,
focusing on how the data is structured and stored in a SQL database like
Postgres. They explored the possibility of converting this data into a graph
format for more flexible analysis using tools like Gremlin. Adam explained the
current state of the project, including the use of IPFS IDs and Ethereum
addresses as global pointers, and mentioned plans to host the code on Railway,
though Sam suggested other options. They agreed that Sam would focus on
extracting and analyzing the data, while Adam would handle the core indexing
logic.

### Blockchain Application Development Planning

Adam and Sam discussed the development of a blockchain application, focusing on
the role of indexers and the creation of a schema for data generation. They
agreed that the next steps involve Adam working on defining the indexer's output
and creating a schema, while Sam will work on generating fake data and mapping
it into a graph language. They also discussed using Docker to create a local
development environment, which should simplify Sam's work as he can focus on
interacting with APIs. The conversation ended with an agreement to add the
meeting transcript to their GitLab repository.
