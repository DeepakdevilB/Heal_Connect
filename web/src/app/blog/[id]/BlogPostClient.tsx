'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Clock, Calendar, User, Share2 } from 'lucide-react';
import Navbar from '@/components/navbar';
import ReactMarkdown from 'react-markdown';

export default function SingleBlogPage() {
  const { id } = useParams();
  const router = useRouter();
  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
        const res = await fetch(`${API_URL}/api/blogs/${id}`).then(r => r.json());
        if (res.success) {
          setBlog(res.data.blog);
        } else {
          router.push('/blog');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchBlog();
    }
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center pt-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        </div>
      </div>
    );
  }

  if (!blog) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1a1a1a] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <article className="container mx-auto px-4 max-w-4xl">
          
          <Link href="/blog" className="inline-flex items-center text-amber-600 hover:text-amber-700 font-medium mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Articles
          </Link>

          <header className="mb-10 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {blog.title}
            </h1>
            
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500 mb-8">
              <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-medium">
                <User className="w-4 h-4" />
                {blog.author || 'Heal Connect Admin'}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date(blog.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                5 min read
              </span>
            </div>
            
            {blog.imageUrl && (
              <div className="w-full h-[300px] md:h-[450px] relative rounded-3xl overflow-hidden shadow-xl mb-12">
                <Image src={blog.imageUrl} alt={blog.title} fill className="object-cover" />
              </div>
            )}
          </header>

          <div className="prose prose-lg prose-amber max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-amber-600">
            <ReactMarkdown>{blog.content}</ReactMarkdown>
          </div>

          <hr className="my-12 border-gray-200" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xl">
                {(blog.author || 'H')[0].toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-gray-900">{blog.author || 'Heal Connect Admin'}</h4>
                <p className="text-sm text-gray-500">Author</p>
              </div>
            </div>
            
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full font-medium text-gray-700 transition-colors">
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>

        </article>
      </main>
    </div>
  );
}
