const fetch = require('node-fetch');

async function testLMStudio() {
  console.log('Testing LM Studio connection...');
  try {
    const response = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5-vl-7b-instruct',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('LM Studio response:', data.choices[0].message.content);
    return true;
  } catch (error) {
    console.error('LM Studio test failed:', error.message);
    return false;
  }
}

testLMStudio().then(success => {
  if (success) {
    console.log('LM Studio test completed successfully');
  } else {
    console.log('LM Studio test failed');
  }
});