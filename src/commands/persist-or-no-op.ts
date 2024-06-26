import {pipe} from 'fp-ts/lib/function';
import * as TE from 'fp-ts/TaskEither';
import {DomainEvent} from '../types';
import * as O from 'fp-ts/Option';
import {StatusCodes} from 'http-status-codes';
import {Dependencies} from '../dependencies';
import {Resource} from '../types/resource';

export const persistOrNoOp =
  (
    commitEvent: Dependencies['commitEvent'],
    resource: Resource,
    version: number
  ) =>
  (toPersist: O.Option<DomainEvent>) =>
    pipe(
      toPersist,
      O.matchW(
        () =>
          TE.right({
            status: StatusCodes.OK,
            message: 'No new events raised',
          }),
        commitEvent(resource, version)
      )
    );
