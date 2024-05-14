import {Request, Response} from 'express';
import {pipe} from 'fp-ts/lib/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import {formatValidationErrors} from 'io-ts-reporters';
import {StatusCodes} from 'http-status-codes';
import {failureWithStatus} from '../types/failureWithStatus';
import {Dependencies} from '../dependencies';
import {sequenceS} from 'fp-ts/lib/Apply';
import {Command} from '../types/command';
import {Actor} from '../types/actor';
import {getUserFromSession} from '../authentication';
import {oopsPage} from '../shared-pages';
import {persistOrNoOp} from './persist-or-no-op';

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

const getActorFrom = (session: unknown, deps: Dependencies) =>
  pipe(
    session,
    getUserFromSession(deps),
    TE.fromOption(() =>
      failureWithStatus('You are not logged in', StatusCodes.UNAUTHORIZED)()
    ),
    TE.map(user => ({tag: 'user', user}) satisfies Actor)
  );

export const formPost =
  <T>(deps: Dependencies, command: Command<T>, successTarget: string) =>
  async (req: Request, res: Response) => {
    await pipe(
      {
        actor: getActorFrom(req.session, deps),
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
      TE.mapLeft(failure => {
        deps.logger.warn(
          {...failure, url: req.originalUrl},
          'Could not handle form POST'
        );
        return failure;
      }),
      TE.match(
        ({status, message}) => res.status(status).send(oopsPage(message)),
        () => res.redirect(successTarget)
      )
    )();
  };
