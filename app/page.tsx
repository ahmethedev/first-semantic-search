'use client'
import { useState } from "react"
export default function Home() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState('')
  const [loading, setLoading] = useState(false)

  async function createIndexAndEmbeddings () {
    try{
      const result = await fetch('/api/setup', {
        method: 'POST'
      })
      const json = await result.json()
      console.log('result:' ,json)
    } catch (err) {
      console.log(err)
    }
  }
  async function sendQuery () {
    if (!query) return
    setResults('')
    setLoading(true)
    try {
      const result = await fetch('/api/query', {
        method: 'POST',
        body: JSON.stringify(query)
      })
      const json = await result.json()
      setResults(json.data)
      setLoading(false)
    } catch (err) {
      console.log(err)
      setLoading(false)
    }
  }
  return (
    <main className="flex flex-col items-center justify-between p-24">
      <input className="text-black px-2 py-1"
      onChange={e => setQuery(e.target.value)}  />
      <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={sendQuery}> Ask GPT </button>
      {
        loading && <p> Asking GPT... </p>
      }
      {
        results && <p> {results} </p>
      }
      <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={createIndexAndEmbeddings}> Create Index and Embeddings </button>
    </main>
  )
}
