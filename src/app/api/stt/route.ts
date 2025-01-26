import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log('API route triggered');
  
  try {
    const formData = await request.formData();
    const audioFile = formData.get('file') as File;
    
    console.log('Audio file received:', audioFile?.name, audioFile?.size);

    const monlamFormData = new FormData();
    monlamFormData.append('file', audioFile);
    monlamFormData.append('lang', 'bo');

    console.log('Calling Monlam API...');
    const response = await fetch('https://api.staging.monlam.ai/api/v1/stt/file', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MONLAM_API_KEY}`,
      },
      body: monlamFormData,
    });

    console.log('Monlam API response status:', response.status);
    const data = await response.json();
    console.log('Monlam API response data:', data);

    return NextResponse.json(data);

  } catch (error) {
    console.error('Detailed error:', error);
    return NextResponse.json(
      { error: 'Error processing speech to text' },
      { status: 500 }
    );
  }
}