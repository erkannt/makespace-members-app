import * as O from 'fp-ts/Option';

export type MemberDetails = Member & Details;

export type Member = {
  number: number;
  email: string;
};

type Details = {
  name: O.Option<string>;
  pronouns: O.Option<string>;
  isSuperUser: boolean;
};
