import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    await fs.mkdir(uploadsDir, { recursive: true })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
    const safeExt = ext.replace(/[^a-z0-9]/gi, '') || 'bin'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`
    const filePath = path.join(uploadsDir, filename)
    await fs.writeFile(filePath, buffer)

    const url = `/uploads/${filename}`
    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 })
  }
}


