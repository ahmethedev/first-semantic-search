import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAI } from "langchain/llms/openai";
import {loadQAStuffChain}   from "langchain/chains";
import { Document } from "langchain/document";
import { timeout } from "./config";

export const createPinecodeIndex = async (
    client,
    indexName,
    vectorDimension
) => {
    console.log(`checking the index "${indexName}"...`);
    const existingIndexes = await client.listIndexes();
    if (!existingIndexes.includes(indexName)) {
        console.log(`creating the index "${indexName}"...`);
        await client.createIndex({createRequest:{
            name: indexName,
            dimension: vectorDimension,
            metric: "cosine",
        }});
        console.log(`creating the index "${indexName}" please wait...`);
        await new Promise((resolve) => setTimeout(resolve, timeout));
    }
    else{
        console.log(`index "${indexName}" already exists`);
    }
}

export const updatePincecode = async (client, indexName, docs) => {
    const index = client.Index(indexName);
    console.log(`Pinecode index retrived:  "${indexName}"`);
    for (const doc of docs) {
        console.log(`Processing document:  "${doc.metadata.source}"`);
        const txtPath = doc.metadata.source;
        const text= doc.pageContent;
        const text_splitter = new RecursiveCharacterTextSplitter({chunkSize: 1000});
        console.log('Splitting text into chunks...');
        const chunks = await text_splitter.createDocuments([text]);
        console.log(`Text split into ${chunks.length} chunks`);
        console.log(`Calling OpenAI' Embeddings API endpoint documents with ${chunks.length} chunks...`);
        const embeddingArrays = await new OpenAIEmbeddings().embedDocuments(
            chunks.map((chunk) => chunk.pageContent.replace(/\n/g, " "))
        );
        console.log(`Creating ${chunks.length} vectors arrays with id,values and metadata...`);
        const batchSize = 100;
        let batch:any = [];
        for(let idx = 0; idx < chunks.length; idx++){
            const chunk = chunks[idx];
            const vector = {
                id: `${txtPath}-${idx}`,
                values: embeddingArrays[idx],
                metadata: {
                    ...chunk.metadata,
                    loc: JSON.stringify(chunk.metadata.loc),
                    pageContent: chunk.pageContent,
                    txtPath: txtPath,

                },
            };
            batch = [...batch, vector];
            if (batch.length === batchSize || idx === chunks.length - 1) {
                await index.upsert({
                    upsertRequest: {
                        vectors: batch,
                    },
                });
                batch = []; // restart batch
            }
        }
    }
}

export const queryPineconeVectorStoreAndQueryLLM = async (
    client,
    indexName,
    question ) => {
        console.log(`Querying Pinecone vector store...`);
        const index = client.Index(indexName);

        const queryEmbedding = await new OpenAIEmbeddings().embedQuery(question);
        let queryResponse = await index.query({
            queryRequest: {
                topK: 10,
                vector: queryEmbedding,
                includeMetadata: true,
                includeValues: true,
    },
    });
        console.log(`Found ${queryResponse.matches.length} matches `);
        console.log(`Asking question: ${question}...`);
        if (queryResponse.matches.length){
            const llm = new OpenAI({});
            const chain = loadQAStuffChain(llm);
            const concatentatedPageContent = queryResponse.matches.map((match) => match.metadata.pageContent).join(" ");
            const result = await chain.call({
                input_documents: [new Document({pageContent: concatentatedPageContent})],
                question: question,
            });
            console.log(`Answer: ${result.answer}`);
            return result.text;
        }else {
            console.log(`No matches found`);   
        }
        
    }
