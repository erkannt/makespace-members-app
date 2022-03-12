import express, {Application, Request, Response} from 'express';
import {pipe} from 'fp-ts/lib/function';
import path from 'path';
import {checkYourMailPage} from './check-your-mail-page';
import {invalidEmailPage} from './invalid-email-page';
import {landingPage} from './landing-page';
import * as E from 'fp-ts/Either';
import {sendMemberNumberByEmail} from './send-member-number-by-email';

const app: Application = express();
const port = 8080;

app.use(express.urlencoded({extended: true}));

app.get('/', (req: Request, res: Response) => {
  res.status(200).send(landingPage);
});

app.get('/check-your-mail', (req: Request, res: Response) => {
  const email = req.query.email ?? '<no email supplied>';
  res.status(200).send(checkYourMailPage(email.toString()));
});

app.use('/static', express.static(path.resolve(__dirname, './static')));

app.post('/send-member-number-by-email', (req: Request, res: Response) => {
  pipe(
    req.body,
    sendMemberNumberByEmail,
    E.matchW(
      () => res.status(400).send(invalidEmailPage),
      email => res.redirect(`/check-your-mail?email=${email}`)
    )
  );
});

app.listen(port, () =>
  process.stdout.write(`Server is listening on port ${port}!\n`)
);
