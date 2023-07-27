import { NextResponse } from "next/server";
import { PineconeClient } from "@pinecone-database/pinecone";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { createPinecodeIndex, updatePincecode } from "@/utils";
import { indexName } from "@/config";


export async function POST() {
    const loader = new DirectoryLoader('./documents',{
        ".txt": (path) => new TextLoader(path),
        ".pdf": (path) => new PDFLoader(path),
        ".md": (path) => new TextLoader(path)
    })
    const docs = await loader.load();
    const vectorDimensions = 1536;

    const client = new PineconeClient();
    await client.init({
        apiKey: process.env.PINECONE_API_KEY || "",
        environment: process.env.PINECONE_ENVIRONMENT || ""
    })

    try {
        await createPinecodeIndex(client, indexName, vectorDimensions);
        await updatePincecode(client, indexName, docs);

    } catch (error) {
        console.log(error)
    }
    return NextResponse.json({
        data: "successfully created index and loaded data into pinecone..."
    });
} 