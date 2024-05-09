import {Request, Response} from 'express';
import {Config} from '../configuration';
import {pipe} from 'fp-ts/lib/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import {formatValidationErrors} from 'io-ts-reporters';
import * as t from 'io-ts';
import {DomainEvent} from '../types';
import * as O from 'fp-ts/Option';
import {StatusCodes} from 'http-status-codes';
import {failureWithStatus} from '../types/failureWithStatus';
import {Dependencies} from '../dependencies';
import {sequenceS} from 'fp-ts/lib/Apply';
import {Command} from '../types/command';
import {Actor} from '../types/actor';

const getCommandFrom = <T>(body: unknown, command: Command<T>) =>
  pipe(
    body,
    command.decode,
    E.mapLeft(formatValidationErrors),
    E.mapLeft(
      failureWithStatus('Could not decode command', StatusCodes.BAD_REQUEST)
    ),
    TE.fromEither
  );

export const persistOrNoOp =
  (commitEvent: Dependencies['commitEvent']) =>
  (toPersist: O.Option<DomainEvent>) =>
    pipe(
      toPersist,
      O.matchW(
        () =>
          TE.right({
            status: StatusCodes.OK,
            message: 'No new events raised',
          }),
        commitEvent
      )
    );

const getActorFrom = (authorization: unknown, conf: Config) =>
  pipe(
    authorization,
    t.string.decode,
    E.mapLeft(
      failureWithStatus(
        'Missing authorization header',
        StatusCodes.UNAUTHORIZED
      )
    ),
    E.chain(authString =>
      authString === `Bearer ${conf.ADMIN_API_BEARER_TOKEN}`
        ? E.right({tag: 'token', token: 'admin'} satisfies Actor)
        : E.left(
            failureWithStatus('Bad Bearer Token', StatusCodes.UNAUTHORIZED)()
          )
    ),
    TE.fromEither
  );

export const apiPost =
  <T>(deps: Dependencies, conf: Config, command: Command<T>) =>
  async (req: Request, res: Response) => {
    await pipe(
      {
        actor: getActorFrom(req.headers.authorization, conf),
        command: getCommandFrom(req.body, command),
        events: deps.getAllEvents(),
      },
      sequenceS(TE.ApplySeq),
      TE.filterOrElse(command.isAuthorized, () =>
        failureWithStatus(
          'You are not authorized to perform this action',
          StatusCodes.UNAUTHORIZED
        )()
      ),
      TE.map(command.process),
      TE.chainW(persistOrNoOp(deps.commitEvent)),
      TE.match(
        ({status, message, payload}) =>
          res.status(status).send({message, payload}),
        ({status, message}) => res.status(status).send({message})
      )
    )();
  };
