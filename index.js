import express from 'express'; // express 모듈을 가져옴
import OpenAI from 'openai'; // OpenAI 모듈을 가져옴
import dotenv from 'dotenv'; // dotenv 모듈을 가져옴
import cors from 'cors'; // cors 모듈을 가져옴

dotenv.config(); // .env 파일에서 환경 변수를 로드함

const app = express(); // express 애플리케이션 생성
const PORT = process.env.PORT || 3000; // 포트를 환경 변수에서 가져오거나 기본값으로 3000을 사용

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); // OpenAI 인스턴스를 API 키로 초기화

// CORS 설정
const corsOptions = {
  origin: [
    "https://port-0-test-back-lxlts66g89582f3b.sel5.cloudtype.app",
    "https://web-math-front-backup-lxlts66g89582f3b.sel5.cloudtype.app",
    "http://localhost:3000",
    "http://127.0.0.1:5501",
  ], // 허용할 도메인들
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE", // 허용할 HTTP 메서드
  credentials: true, // 쿠키 허용 여부
  optionsSuccessStatus: 204, // 사전 요청에 대한 성공 상태 코드
};

app.use(cors(corsOptions)); // CORS 미들웨어 사용
app.use(express.json()); // JSON 요청 본문 파싱 미들웨어 사용

// Pre-flight 요청을 허용 (옵션 요청)
app.options('*', cors(corsOptions));

app.post('/get-response', async (req, res) => {
  const { message } = req.body; // 요청 본문에서 메시지를 추출

  if (!message.startsWith("나는") || !message.includes("사람")) {
    return res.status(200).json({ response: "당신은 어떠한 사람인지 알려주세요. 나는 ~~ 사람이다. 라고 써주세요." });
  }

  try {
    const assistant = await openai.beta.assistants.create({
      name: "만물박사",
      instructions: "너는 만물박사야. 어떤 성향을 가지고 있는 사람인지 입력하면 비유할 단어를 찾아서 말해줘. 친구처럼 친근하게 답해줘. 더 좋은 습관을 갖기 위한 개선 방법을 3개 알려줘. 예시를 알려줄게. 나는 미루는 사람이야. 라고 입력하면, 너는 '나는 사자다. 왜냐하면 밀림의 왕이기 때문이다. 과제도 밀림, 마감도 밀림, 집안일도 밀림 다 밀려있으니까' 라고 답할 수 있어. 한국어의 언어유희를 사용해줘. 사용하는 단어는 명사야. 이 습관을 개선하기 위한 방법을 친절히 알려줘.",
      tools: [{ type: "code_interpreter" }], // 코드 인터프리터 도구 설정
      model: "gpt-4o" // 사용할 모델 설정
    });

    const thread = await openai.beta.threads.create(); // 새로운 쓰레드 생성

    // 사용자 메시지를 쓰레드에 추가
    await openai.beta.threads.messages.create(
      thread.id,
      {
        role: "user",
        content: `저는 ${message}`
      }
    );

    let responseText = ''; // 응답 텍스트를 저장할 변수

    // OpenAI 쓰레드 실행
    const run = openai.beta.threads.runs.stream(thread.id, {
      assistant_id: assistant.id
    });

    // 텍스트가 생성될 때마다 호출되는 이벤트 핸들러
    run.on('textCreated', (text) => {
      console.log('\nassistant > ', text);
      responseText += text; // 응답 텍스트에 추가
    });

    // 텍스트 델타가 발생할 때마다 호출되는 이벤트 핸들러
    run.on('textDelta', (textDelta) => {
      console.log(textDelta.value);
      responseText += textDelta.value; // 응답 텍스트에 추가
    });

    // 도구 호출이 생성될 때마다 호출되는 이벤트 핸들러
    run.on('toolCallCreated', (toolCall) => {
      console.log(`\nassistant > ${toolCall.type}\n\n`);
    });

    // 도구 호출 델타가 발생할 때마다 호출되는 이벤트 핸들러
    run.on('toolCallDelta', (toolCallDelta) => {
      if (toolCallDelta.type === 'code_interpreter') {
        if (toolCallDelta.code_interpreter.input) {
          console.log(toolCallDelta.code_interpreter.input);
          responseText += toolCallDelta.code_interpreter.input; // 응답 텍스트에 추가
        }
        if (toolCallDelta.code_interpreter.outputs) {
          console.log("\noutput >\n");
          toolCallDelta.code_interpreter.outputs.forEach(output => {
            if (output.type === "logs") {
              console.log(`\n${output.logs}\n`);
              responseText += output.logs; // 응답 텍스트에 추가
            }
          });
        }
      }
    });

    // 실행이 끝났을 때 호출되는 이벤트 핸들러
    run.on('end', () => {
      if (responseText.includes("[object Object]")) {
        responseText = responseText.replace("[object Object]", "").trim();
      }
      res.status(200).json({ response: responseText }); // 최종 응답을 클라이언트에게 전송
    });

  } catch (error) {
    console.error(error); // 에러 로그 출력
    res.status(500).send('An error occurred'); // 에러 응답 전송
  }
});

// 서버 시작
app.listen(PORT, function () {
  console.log(`${PORT}번 포트에서 서버가 실행 중입니다.`); // 서버 실행 메시지 출력
});
