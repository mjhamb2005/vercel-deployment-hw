import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-8">MAYA'S CRACK'D</h1>

      <div className="space-y-4">
        <Link href="/hello">
          <button className="w-64 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-4 px-6 rounded-full transition">
            Hello World
          </button>
        </Link>

        <Link href="/captions">
          <div className="text-center text-lg hover:text-gray-300 transition cursor-pointer">
            Captions List
          </div>
        </Link>

        <Link href="/protected">
          <div className="text-center text-lg hover:text-gray-300 transition cursor-pointer">
            Protected Page 🔒
          </div>
        </Link>
      </div>
    </div>
  )
}