import {sequenceS} from 'fp-ts/lib/Apply';
import {pipe} from 'fp-ts/lib/function';
import {User} from '../../types';
import {Dependencies} from '../../dependencies';
import * as TE from 'fp-ts/TaskEither';
import * as RA from 'fp-ts/ReadonlyArray';

export const constructViewModel = (deps: Dependencies) => (user: User) =>
  pipe(
    {
      user: TE.right(user),
      trainers: deps.getTrainers(),
      isSuperUser: pipe(
        deps.getAllEvents(),
        TE.map(RA.some(event => event.memberNumber === user.memberNumber))
      ),
    },
    sequenceS(TE.ApplySeq)
  );