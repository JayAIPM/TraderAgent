import readline from 'readline';
import { unifiedExtractor } from './src/agent/UnifiedExtractor';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function test() {
  console.log('🤖 待办事项统一提取器 - 交互式测试\n');
  console.log('输入您的指令（输入 "quit" 或 "exit" 退出\n');

  while (true) {
    const input = await askQuestion('📝 请输入测试指令: ');

    if (input.toLowerCase() === 'quit' || input.toLowerCase() === 'exit') {
      console.log('👋 再见！');
      rl.close();
      process.exit(0);
    }

    console.log('\n' + '='.repeat(80));
    console.log('🔍 正在提取中...');
    console.log('='.repeat(80));

    try {
      const result = await unifiedExtractor.extract(input);
      console.log('\n✅ 提取结果:');
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('\n❌ 测试失败:', error);
    }

    console.log('\n' + '-'.repeat(80) + '\n');
  }
}

test().catch((err) => {
  console.error('🚨 测试脚本异常:', err);
  rl.close();
  process.exit(1);
});
