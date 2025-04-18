import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Problem } from "../../entities/problem.entity";
import { Topic } from "../../entities/topic.entity";
import { CreateProblemDto } from "./dto/create-problem.dto";
import { UpdateProblemDto } from "./dto/update-problem.dto";
import { RepositoryUtils } from "../../utilities/repository-utils/findOrFail";
import { AppException } from "../../utilities/exceptions/exception";

@Injectable()
export class ProblemService
{
  constructor(
    @InjectRepository(Problem)
    private problemRepository: Repository<Problem>,

    @InjectRepository(Topic)
    private topicRepository: Repository<Topic>
  ) {}

  async getOne(id: number): Promise<Problem>
  {
    const problem = await this.problemRepository.findOne({
      where: { id },
      select: [ 'id', 'order', 'answer', 'topicId' ]
    });

    if (!problem) {
      throw new NotFoundException('Problem is not found');
    }

    return problem;
  }

  async getAll(page: number, limit: number): Promise<{problems: Problem[]}>
  {
    const problems = await this.problemRepository.find({
      select: ['id', 'topicId', 'order'],
      order: {
        topicId: 'ASC',
        order: 'ASC'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    return { problems };
  }

  async create(createDto: CreateProblemDto): Promise<Problem>
  {
    const topic = await RepositoryUtils.findOrFail(
      this.topicRepository,
      createDto.topicId,
      'Topic is not found'
    );

    if (!this.isValidProblemAnswer(createDto.answer)) {
      throw new AppException('Invalid answer format');
    }

    const problems = await this.problemRepository.find({
      select: ['id', 'topicId', 'order'],
    });

    const problem = this.problemRepository.create(createDto);
    problem.topicId = createDto.topicId;

    if (problems.some(i => i.topicId === problem.topicId && i.order === problem.order)) {
      throw new AppException('Invalid topicId or order');
    }

    return this.problemRepository.save(problem);

  }

  async update(id: number, updateDto: UpdateProblemDto): Promise<ShortResponse>
  {
    const problem = await RepositoryUtils.findOrFail(
      this.problemRepository,
      id,
      `Problem with ID ${id} is not found`
    );

    if(updateDto.topicId){
      await RepositoryUtils.findOrFail(
        this.topicRepository,
        updateDto.topicId,
        'Topic is not found'
      );

      problem.topicId = updateDto.topicId;
    }

    Object.assign(problem, updateDto);

    await this.problemRepository.save(problem);

    return {
      status: 'success',
      message: 'Problem has been deleted successfully',
    };
  }

  async delete(id: number): Promise<ShortResponse>
  {

    const problem = await this.problemRepository.findOne({where: { id }});

    if(!problem) {
      throw new NotFoundException(`Problem with ID ${id} is not found`);
    }

    await this.problemRepository.delete(id)

    return {
      status: 'success',
      message: 'Problem has been deleted successfully',
    };
  }


  private isValidProblemAnswer(answer: any): boolean {
    if (!answer || !Array.isArray(answer.fields)) {
      return false;
    }

    return answer.fields.every(
      (field) =>
        typeof field.index === 'number' &&
        (typeof field.value === 'string' || typeof field.value === 'number')
    );
  }

  private transformProblem(problem: Problem): any {
    return {
      id: problem.id,
      order: problem.order,
      topicId: problem.topicId,
      answer: {
        fields: problem.answer.fields.map(field => ({
          index: field.index,
          value: 'Student Input' // Placeholder to hide the correct answer
        }))
      }
    };
  }

}